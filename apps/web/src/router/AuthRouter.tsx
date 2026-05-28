import React from 'react';
import { Routes, Route } from 'react-router-dom';
import * as authConsts from '../features/auth/auth.constants';
import { LoginPage } from '../pages/auth/LoginPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { AcceptInvitePage } from '../pages/auth/AcceptInvitePage';
import { MainLayout } from '../layouts/MainLayout';

export const AuthRouter: React.FC = () => {
  return (
    <MainLayout menuItems={[]}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path={authConsts.RESET_PWD_PATH} element={<ResetPasswordPage />} />
        <Route path={authConsts.ACCEPT_INVITE_PATH} element={<AcceptInvitePage />} />
      </Routes>
    </MainLayout>
  );
};
