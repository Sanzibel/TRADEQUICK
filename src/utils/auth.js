export const AUTH_CHANGED_EVENT = 'quicktrade-auth-changed';

export const getStoredToken = () => localStorage.getItem('token');

export const getStoredUser = () => {
  try {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
};

export const hasAuthSession = () => Boolean(getStoredToken() && getStoredUser());

export const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};
