import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasAuthSession } from '../utils/auth';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!hasAuthSession()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
