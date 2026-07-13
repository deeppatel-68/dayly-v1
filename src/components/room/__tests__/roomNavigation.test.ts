import { describe, expect, it } from "vitest";
import {
  createRoomNavigationController,
  getNextRoomView,
  getPreviousRoomView,
  getRoomViewForSwipe,
  ROOM_CAMERA_PROFILES,
  ROOM_VIEW_TRANSITION_SECONDS,
  ROOM_VIEWS,
} from "../roomNavigation";

describe("room navigation", () => {
  it("exposes authored camera profiles for every guided view", () => {
    expect(ROOM_VIEWS).toEqual(["home", "desk", "windowShelf"]);
    for (const view of ROOM_VIEWS) {
      expect(ROOM_CAMERA_PROFILES[view].position).toHaveLength(3);
      expect(ROOM_CAMERA_PROFILES[view].target).toHaveLength(3);
      expect(ROOM_CAMERA_PROFILES[view].fov).toBeGreaterThan(0);
    }
    expect(ROOM_CAMERA_PROFILES.home.position).toEqual([0.55, 1.42, 5.8]);
  });

  it("wraps next and previous selection and maps horizontal swipes", () => {
    expect(getNextRoomView("home")).toBe("desk");
    expect(getNextRoomView("windowShelf")).toBe("home");
    expect(getPreviousRoomView("home")).toBe("windowShelf");
    expect(getRoomViewForSwipe("home", -40)).toBe("desk");
    expect(getRoomViewForSwipe("home", 40)).toBe("windowShelf");
    expect(getRoomViewForSwipe("home", 39)).toBe("home");
  });

  it("smoothly reaches the selected profile in about 300ms", () => {
    const navigation = createRoomNavigationController();
    const pose = navigation.pose;
    const position = pose.position;
    const target = pose.target;

    navigation.setView("windowShelf");
    const halfway = navigation.update(ROOM_VIEW_TRANSITION_SECONDS / 2);
    expect(halfway).toBe(pose);
    expect(halfway.position).toBe(position);
    expect(halfway.target).toBe(target);
    expect(halfway.position.x).toBeCloseTo(
      (ROOM_CAMERA_PROFILES.home.position[0] +
        ROOM_CAMERA_PROFILES.windowShelf.position[0]) /
        2,
    );
    expect(halfway.fov).toBeCloseTo(
      (ROOM_CAMERA_PROFILES.home.fov + ROOM_CAMERA_PROFILES.windowShelf.fov) /
        2,
    );

    const settled = navigation.update(ROOM_VIEW_TRANSITION_SECONDS / 2);
    expect(settled.position.toArray()).toEqual(
      ROOM_CAMERA_PROFILES.windowShelf.position,
    );
    expect(settled.target.toArray()).toEqual(
      ROOM_CAMERA_PROFILES.windowShelf.target,
    );
    expect(settled.fov).toBe(ROOM_CAMERA_PROFILES.windowShelf.fov);
  });

  it("snaps view changes and disables parallax for reduced motion", () => {
    const navigation = createRoomNavigationController({ reducedMotion: true });
    navigation.setParallax(1, 1);
    navigation.next();

    expect(navigation.pose.position.toArray()).toEqual(
      ROOM_CAMERA_PROFILES.desk.position,
    );
    expect(navigation.pose.target.toArray()).toEqual(
      ROOM_CAMERA_PROFILES.desk.target,
    );

    navigation.update(1);
    expect(navigation.pose.position.toArray()).toEqual(
      ROOM_CAMERA_PROFILES.desk.position,
    );
  });

  it("keeps parallax subtle and bounded for normalized or extreme input", () => {
    const navigation = createRoomNavigationController();
    const profile = ROOM_CAMERA_PROFILES.home;

    navigation.setParallax(100, -100);
    navigation.update(1);

    expect(navigation.pose.position.x).toBeGreaterThan(profile.position[0]);
    expect(
      navigation.pose.position.x - profile.position[0],
    ).toBeLessThanOrEqual(0.08);
    expect(
      navigation.pose.position.y - profile.position[1],
    ).toBeLessThanOrEqual(0.05);
    expect(navigation.pose.position.z).toBe(profile.position[2]);
    expect(navigation.pose.target.x - profile.target[0]).toBeLessThanOrEqual(
      0.035,
    );
  });
});
