import React, { useState, useEffect } from 'react';
import api from '../../api';
import { toast } from 'react-toastify';

export default function AdminKYC() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin-ops/kyc/pending');
      setDrivers(res.data);
    } catch (error) {
      toast.error('Erro ao buscar motoristas pendentes.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleReview = async (id, action) => {
    if (!window.confirm(`Tem a certeza que deseja ${action === 'APPROVE' ? 'Aprovar' : 'Rejeitar'} estes documentos?`)) return;
    
    try {
      await api.post(`/admin-ops/kyc/${id}/review`, { action });
      toast.success(`Documentos ${action === 'APPROVE' ? 'Aprovados' : 'Rejeitados'}.`);
      fetchDrivers();
    } catch (error) {
      toast.error('Erro ao processar a validação.');
    }
  };

  if (loading) return <div className="p-6">Carregando documentos...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Validação KYC (Novos Motoristas)</h1>
      
      {drivers.length === 0 ? (
        <div className="bg-white p-6 rounded shadow border border-gray-100 text-center text-gray-500">
          Nenhum motorista pendente de aprovação.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {drivers.map(driver => (
            <div key={driver._id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{driver.name}</h3>
                  <p className="text-sm text-gray-500">{driver.email} | {driver.phoneNumber}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleReview(driver._id, 'REJECT')} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded hover:bg-red-200">Rejeitar</button>
                  <button onClick={() => handleReview(driver._id, 'APPROVE')} className="px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600">Aprovar Documentos</button>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-600 mb-2">Carta de Condução (Frente)</h4>
                  <div className="bg-gray-100 h-64 rounded-lg overflow-hidden flex items-center justify-center">
                    {driver.deliveryman?.license_front ? (
                      <img src={driver.deliveryman.license_front} alt="Carta" className="w-full h-full object-contain" />
                    ) : <span className="text-gray-400">Sem Imagem</span>}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-600 mb-2">Livrete do Veículo (Frente)</h4>
                  <div className="bg-gray-100 h-64 rounded-lg overflow-hidden flex items-center justify-center">
                    {driver.deliveryman?.document_front ? (
                      <img src={driver.deliveryman.document_front} alt="Livrete" className="w-full h-full object-contain" />
                    ) : <span className="text-gray-400">Sem Imagem</span>}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-600 mb-2">Fotografia (Selfie)</h4>
                  <div className="bg-gray-100 h-64 rounded-lg overflow-hidden flex items-center justify-center">
                    {driver.deliveryman?.photo ? (
                      <img src={driver.deliveryman.photo} alt="Foto" className="w-full h-full object-contain" />
                    ) : <span className="text-gray-400">Sem Imagem</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
