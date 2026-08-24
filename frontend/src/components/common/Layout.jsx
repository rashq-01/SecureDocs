import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

import TopNav from './TopNav';

const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-secondary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;