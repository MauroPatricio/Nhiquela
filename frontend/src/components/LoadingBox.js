import { useEffect } from 'react';
import Spinner from 'react-bootstrap/Spinner';

export default function LoadingBox() {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Spinner animation="grow"  role="status">
      <span className="visually-hidden">Processando...</span>
    </Spinner>
  );
}
