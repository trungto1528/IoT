import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { LoginPage } from './login';
import { MainLayout } from './layout';
import { Dashboard } from './dashboard';
import { SensorData } from './data';
import { ActivityHistory } from './activity';
import {Profile} from './profile';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang Login đứng độc lập, không có Sidebar */}
        <Route path="/" element={<LoginPage />} />

        {/* Tất cả các trang bên dưới sẽ xài chung MainLayout (có Sidebar) */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data" element={<SensorData />} />
          <Route path="/activity" element={<ActivityHistory />} />
          <Route path="/profile" element={<Profile/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}