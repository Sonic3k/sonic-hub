/* Huyền học — loaded on demand. Tử vi is its first section; more can sit beside it under /huyen-hoc. */
import { Navigate, Route, Routes } from 'react-router-dom';
import TuViHome from './Home';
import ChartPage from './ChartPage';
import { BookEntryPage, BookIndex } from './Book';
import Lookup from './Lookup';
import Phan1 from './Phan1';

export default function HuyenHoc() {
  return (
    <Routes>
      <Route index element={<Navigate to="/huyen-hoc/tu-vi" replace />} />
      <Route path="tu-vi" element={<TuViHome />} />
      <Route path="tu-vi/la-so" element={<ChartPage />} />
      <Route path="tu-vi/la-so/:id" element={<ChartPage />} />
      <Route path="tu-vi/sach" element={<BookIndex />} />
      <Route path="tu-vi/sach/:line" element={<BookEntryPage />} />
      <Route path="tu-vi/tra-cuu" element={<Lookup />} />
      <Route path="tu-vi/phan-1" element={<Phan1 />} />
      <Route path="*" element={<Navigate to="/huyen-hoc/tu-vi" replace />} />
    </Routes>
  );
}
