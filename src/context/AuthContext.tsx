import { supabase } from "@/lib/supabase";
import { migrateLegacyUserData } from "@/services/settingsService";
import { logSupabaseError } from "@/utils/supabaseErrors";
import { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  last_reset_date?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile from Supabase
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" - we'll handle that below
        logSupabaseError("Error loading profile:", error);
        return null;
      }

      return data as UserProfile | null;
    } catch (error) {
      logSupabaseError("Error loading profile:", error);
      return null;
    }
  }, []);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setLoading(true);
    setSession(nextSession);

    if (nextSession?.user) {
      const profileData = await loadProfile(nextSession.user.id);
      try {
        await migrateLegacyUserData(nextSession.user.id);
      } catch (error) {
        logSupabaseError("Error migrating legacy user data:", error);
      }
      setUser(nextSession.user);
      setProfile(profileData);
    } else {
      setUser(null);
      setProfile(null);
    }

    setLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    // Check active session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        applySession(session);
      })
      .catch((error) => {
        logSupabaseError("Error getting auth session:", error);
        applySession(null);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session).catch((error) => {
        logSupabaseError("Error applying auth session:", error);
      });
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Create profile
    if (data.user) {
      await supabase
        .from("profiles")
        .insert([{ id: data.user.id, email: data.user.email }]);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const updateUsername = async (username: string) => {
    if (!user) throw new Error("No user logged in");

    // Validate username
    if (username.length < 2) {
      throw new Error("Username must be at least 2 characters");
    }
    if (username.length > 30) {
      throw new Error("Username must be less than 30 characters");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error(
        "Username can only contain letters, numbers, and underscores"
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    // Update local profile state
    setProfile((prev) => (prev ? { ...prev, username } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
