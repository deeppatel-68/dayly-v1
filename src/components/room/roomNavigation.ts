import * as THREE from "three";

export const ROOM_VIEWS = ["home", "desk", "windowShelf"] as const;

export type RoomView = (typeof ROOM_VIEWS)[number];
export type RoomVector = readonly [number, number, number];
export type RoomSwipeDirection = "next" | "previous";

export interface RoomCameraProfile {
  readonly position: RoomVector;
  readonly target: RoomVector;
  readonly fov: number;
}

export interface RoomCameraPose {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
  fov: number;
  view: RoomView;
}

export interface RoomNavigationOptions {
  initialView?: RoomView;
  reducedMotion?: boolean;
}

export const ROOM_VIEW_TRANSITION_SECONDS = 0.3;
export const ROOM_SWIPE_THRESHOLD = 40;

export const ROOM_CAMERA_PROFILES: Readonly<
  Record<RoomView, RoomCameraProfile>
> = {
  home: {
    position: [0.55, 1.42, 5.8],
    target: [0.72, 0.86, -0.48],
    fov: 58,
  },
  desk: {
    position: [0.25, 1.5, 5.4],
    target: [0.4, 0.9, -0.8],
    fov: 58,
  },
  windowShelf: {
    position: [0, 1.65, 7.2],
    target: [-0.35, 1.45, -0.85],
    fov: 64,
  },
};

const POSITION_PARALLAX_X = 0.08;
const POSITION_PARALLAX_Y = 0.05;
const TARGET_PARALLAX_X = 0.035;
const TARGET_PARALLAX_Y = 0.02;
const PARALLAX_DAMPING = 12;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const setFromTuple = (vector: THREE.Vector3, tuple: RoomVector) => {
  vector.set(tuple[0], tuple[1], tuple[2]);
};

const smoothstep = (amount: number) => amount * amount * (3 - 2 * amount);

function adjacentRoomView(view: RoomView, offset: number): RoomView {
  const index = ROOM_VIEWS.indexOf(view);
  return ROOM_VIEWS[(index + offset + ROOM_VIEWS.length) % ROOM_VIEWS.length];
}

export function getNextRoomView(view: RoomView): RoomView {
  return adjacentRoomView(view, 1);
}

export function getPreviousRoomView(view: RoomView): RoomView {
  return adjacentRoomView(view, -1);
}

export function getRoomViewForSwipe(
  view: RoomView,
  deltaX: number,
  threshold = ROOM_SWIPE_THRESHOLD,
): RoomView {
  const minimumDistance = Math.abs(threshold);
  if (deltaX <= -minimumDistance) return getNextRoomView(view);
  if (deltaX >= minimumDistance) return getPreviousRoomView(view);
  return view;
}

export class RoomNavigationController {
  readonly pose: RoomCameraPose;

  private readonly basePosition = new THREE.Vector3();
  private readonly baseTarget = new THREE.Vector3();
  private readonly transitionStartPosition = new THREE.Vector3();
  private readonly transitionStartTarget = new THREE.Vector3();

  private selectedView: RoomView;
  private reducedMotion: boolean;
  private transitionElapsed = ROOM_VIEW_TRANSITION_SECONDS;
  private transitionStartFov = 0;
  private baseFov = 0;
  private parallaxX = 0;
  private parallaxY = 0;
  private desiredParallaxX = 0;
  private desiredParallaxY = 0;

  constructor(options: RoomNavigationOptions = {}) {
    this.selectedView = options.initialView ?? "home";
    this.reducedMotion = options.reducedMotion ?? false;

    const profile = ROOM_CAMERA_PROFILES[this.selectedView];
    setFromTuple(this.basePosition, profile.position);
    setFromTuple(this.baseTarget, profile.target);
    this.baseFov = profile.fov;
    this.transitionStartPosition.copy(this.basePosition);
    this.transitionStartTarget.copy(this.baseTarget);
    this.transitionStartFov = this.baseFov;

    this.pose = {
      position: this.basePosition.clone(),
      target: this.baseTarget.clone(),
      fov: this.baseFov,
      view: this.selectedView,
    };
  }

  get view(): RoomView {
    return this.selectedView;
  }

  setView(view: RoomView): RoomView {
    if (view === this.selectedView) return view;

    this.selectedView = view;
    this.pose.view = view;
    if (this.reducedMotion) {
      this.snapToSelectedView();
      return view;
    }

    this.transitionStartPosition.copy(this.basePosition);
    this.transitionStartTarget.copy(this.baseTarget);
    this.transitionStartFov = this.baseFov;
    this.transitionElapsed = 0;
    return view;
  }

  next(): RoomView {
    return this.setView(getNextRoomView(this.selectedView));
  }

  previous(): RoomView {
    return this.setView(getPreviousRoomView(this.selectedView));
  }

  selectFromSwipe(deltaX: number, threshold = ROOM_SWIPE_THRESHOLD): RoomView {
    return this.setView(
      getRoomViewForSwipe(this.selectedView, deltaX, threshold),
    );
  }

  setReducedMotion(reducedMotion: boolean): void {
    if (reducedMotion === this.reducedMotion) return;
    this.reducedMotion = reducedMotion;

    if (reducedMotion) {
      this.parallaxX = 0;
      this.parallaxY = 0;
      this.desiredParallaxX = 0;
      this.desiredParallaxY = 0;
      this.snapToSelectedView();
    }
  }

  setParallax(x: number, y: number): void {
    if (this.reducedMotion) return;
    this.desiredParallaxX = clamp(x, -1, 1);
    this.desiredParallaxY = clamp(y, -1, 1);
  }

  resetParallax(): void {
    this.desiredParallaxX = 0;
    this.desiredParallaxY = 0;
  }

  update(deltaSeconds: number): RoomCameraPose {
    const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    const profile = ROOM_CAMERA_PROFILES[this.selectedView];

    if (this.transitionElapsed < ROOM_VIEW_TRANSITION_SECONDS) {
      this.transitionElapsed = Math.min(
        ROOM_VIEW_TRANSITION_SECONDS,
        this.transitionElapsed + delta,
      );
      const progress = this.transitionElapsed / ROOM_VIEW_TRANSITION_SECONDS;
      const eased = smoothstep(progress);

      this.basePosition.set(
        THREE.MathUtils.lerp(
          this.transitionStartPosition.x,
          profile.position[0],
          eased,
        ),
        THREE.MathUtils.lerp(
          this.transitionStartPosition.y,
          profile.position[1],
          eased,
        ),
        THREE.MathUtils.lerp(
          this.transitionStartPosition.z,
          profile.position[2],
          eased,
        ),
      );
      this.baseTarget.set(
        THREE.MathUtils.lerp(
          this.transitionStartTarget.x,
          profile.target[0],
          eased,
        ),
        THREE.MathUtils.lerp(
          this.transitionStartTarget.y,
          profile.target[1],
          eased,
        ),
        THREE.MathUtils.lerp(
          this.transitionStartTarget.z,
          profile.target[2],
          eased,
        ),
      );
      this.baseFov = THREE.MathUtils.lerp(
        this.transitionStartFov,
        profile.fov,
        eased,
      );

      if (this.transitionElapsed === ROOM_VIEW_TRANSITION_SECONDS) {
        setFromTuple(this.basePosition, profile.position);
        setFromTuple(this.baseTarget, profile.target);
        this.baseFov = profile.fov;
      }
    }

    if (!this.reducedMotion) {
      const parallaxAlpha = 1 - Math.exp(-PARALLAX_DAMPING * delta);
      this.parallaxX +=
        (this.desiredParallaxX - this.parallaxX) * parallaxAlpha;
      this.parallaxY +=
        (this.desiredParallaxY - this.parallaxY) * parallaxAlpha;
    }

    this.pose.position.set(
      this.basePosition.x + this.parallaxX * POSITION_PARALLAX_X,
      this.basePosition.y - this.parallaxY * POSITION_PARALLAX_Y,
      this.basePosition.z,
    );
    this.pose.target.set(
      this.baseTarget.x + this.parallaxX * TARGET_PARALLAX_X,
      this.baseTarget.y - this.parallaxY * TARGET_PARALLAX_Y,
      this.baseTarget.z,
    );
    this.pose.fov = this.baseFov;
    return this.pose;
  }

  private snapToSelectedView(): void {
    const profile = ROOM_CAMERA_PROFILES[this.selectedView];
    setFromTuple(this.basePosition, profile.position);
    setFromTuple(this.baseTarget, profile.target);
    this.baseFov = profile.fov;
    this.transitionStartPosition.copy(this.basePosition);
    this.transitionStartTarget.copy(this.baseTarget);
    this.transitionStartFov = this.baseFov;
    this.transitionElapsed = ROOM_VIEW_TRANSITION_SECONDS;
    this.pose.position.copy(this.basePosition);
    this.pose.target.copy(this.baseTarget);
    this.pose.fov = this.baseFov;
  }
}

export function createRoomNavigationController(
  options: RoomNavigationOptions = {},
): RoomNavigationController {
  return new RoomNavigationController(options);
}
