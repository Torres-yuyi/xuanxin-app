import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/Home/HomePage';
import WallPage from './pages/Wall/WallPage';
import PalettePage from './pages/Palette/PalettePage';
import PlazaPage from './pages/Plaza/PlazaPage';
import MePage from './pages/Me/MePage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="wall" element={<WallPage />} />
        <Route path="palette" element={<PalettePage />} />
        <Route path="plaza" element={<PlazaPage />} />
        <Route path="me" element={<MePage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
