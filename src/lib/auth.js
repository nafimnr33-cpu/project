import { supabase } from './supabase.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const { data: { session } } = await supabase.auth.getSession();
    this.currentUser = session?.user || null;

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        this.currentUser = session?.user || null;
        this.notifyListeners(event, session);
      })();
    });

    this.initialized = true;
  }

  onAuthStateChange(callback) {
    this.authListeners.push(callback);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(event, session) {
    this.authListeners.forEach(callback => callback(event, session));
  }

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getUser() {
    return this.currentUser;
  }

  getUserId() {
    return this.currentUser?.id || null;
  }
}

export const authService = new AuthService();
