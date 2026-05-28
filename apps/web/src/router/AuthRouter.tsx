import React from 'react';
import { Routes, Route } from 'react-router-dom';
import * as authConsts from '../features/auth/auth.constants';
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { AcceptInvitePage } from '../pages/auth/AcceptInvitePage';
import { NotFoundPage } from '../pages/error/NotFoundPage';
import { MainLayout } from '../layouts/MainLayout';

export const AuthRouter: React.FC = () => {
  return (
    <MainLayout menuItems={[]}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path={authConsts.FORGOT_PWD_PATH} element={<ForgotPasswordPage />} />
        <Route path={authConsts.RESET_PWD_PATH} element={<ResetPasswordPage />} />
        <Route path={authConsts.ACCEPT_INVITE_PATH} element={<AcceptInvitePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
};
