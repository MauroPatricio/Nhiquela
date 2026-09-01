import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faChartLine, faMoneyBillWave, faUsers, faMotorcycle, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../../api';

export default function StatsScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialStats();
  }, []);

  const fetchFinancialStats = async () => {
    try {
      const res = await api.get('/stats/financial');
      setData(res.data);
    } catch (err) {
      console.error("Erro ao carregar dashboard financeiro", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-5"><h4>A Carregar Dashboard Financeiro...</h4></div>;
  }

  if (!data) return null;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0" style={{ color: '#1A1A1A' }}>Dashboard Financeiro</h2>
        <span className="text-muted">Métricas em tempo real</span>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 rounded-4" style={{ background: 'linear-gradient(135deg, #7F00FF, #E0B0FF)' }}>
            <div className="card-body p-4 text-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="card-title mb-0 text-white-50">Receita Hoje</h6>
                <div className="rounded-circle bg-white bg-opacity-25 p-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                  <FontAwesomeIcon icon={faWallet} />
                </div>
              </div>
              <h3 className="fw-bold mb-0">{data.receitaHoje.toLocaleString('pt-MZ')} MT</h3>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 rounded-4 bg-white">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="card-title mb-0 text-muted">Receita Semanal</h6>
                <div className="rounded-circle bg-light p-2 d-flex align-items-center justify-content-center text-primary" style={{ width: 40, height: 40 }}>
                  <FontAwesomeIcon icon={faChartLine} />
                </div>
              </div>
              <h3 className="fw-bold mb-0 text-dark">{data.receitaSemana.toLocaleString('pt-MZ')} MT</h3>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 rounded-4 bg-white">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="card-title mb-0 text-muted">Receita Mensal</h6>
                <div className="rounded-circle bg-light p-2 d-flex align-items-center justify-content-center text-success" style={{ width: 40, height: 40 }}>
                  <FontAwesomeIcon icon={faMoneyBillWave} />
                </div>
              </div>
              <h3 className="fw-bold mb-0 text-dark">{data.receitaMes.toLocaleString('pt-MZ')} MT</h3>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 rounded-4 bg-white">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="card-title mb-0 text-muted">Lucro Estimado</h6>
                <div className="rounded-circle bg-light p-2 d-flex align-items-center justify-content-center text-warning" style={{ width: 40, height: 40 }}>
                  <FontAwesomeIcon icon={faMotorcycle} />
                </div>
              </div>
              <h3 className="fw-bold mb-0 text-dark">{data.lucroEstimado.toLocaleString('pt-MZ')} MT</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Gráfico de Receita por Serviço */}
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 rounded-4 h-100 bg-white">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">Receita por Tipo de Serviço</h5>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.receitaPorServico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#666'}} />
                    <RechartsTooltip cursor={{fill: '#F8F9FA'}} />
                    <Bar dataKey="value" fill="#7F00FF" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Extra */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 rounded-4 mb-4 bg-white h-100">
            <div className="card-body p-4 d-flex flex-column justify-content-center">
              <h5 className="fw-bold mb-4">Desempenho Geral</h5>
              
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <span className="text-muted">Serviços Concluídos</span>
                <span className="fw-bold fs-5">{data.numServicosConcluídos}</span>
              </div>
              
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <span className="text-muted">Ticket Médio</span>
                <span className="fw-bold fs-5">{data.ticketMedio.toFixed(2)} MT</span>
              </div>
              
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <span className="text-muted">Motoristas Ativos</span>
                <span className="fw-bold fs-5 text-success">{data.motoristasAtivos}</span>
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Clientes Ativos</span>
                <span className="fw-bold fs-5 text-primary">{data.clientesAtivos}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm border-0 rounded-4 bg-white">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">Top Motoristas (Maior Faturamento)</h5>
              <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead className="text-muted" style={{ borderBottom: '1px solid #eee' }}>
                    <tr>
                      <th className="fw-normal ps-0">Motorista</th>
                      <th className="fw-normal text-center">Viagens Concluídas</th>
                      <th className="fw-normal text-end pe-0">Faturamento Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rankingMotoristas.length === 0 && (
                      <tr><td colSpan="3" className="text-center py-4 text-muted">Ainda sem dados de motoristas</td></tr>
                    )}
                    {data.rankingMotoristas.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: idx !== data.rankingMotoristas.length - 1 ? '1px solid #f8f9fa' : 'none' }}>
                        <td className="ps-0 py-3">
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style={{ width: 40, height: 40, color: '#7F00FF' }}>
                              <FontAwesomeIcon icon={faMotorcycle} />
                            </div>
                            <span className="fw-bold text-dark">{m.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <span className="badge bg-light text-dark px-3 py-2 rounded-pill border">{m.viagens}</span>
                        </td>
                        <td className="text-end fw-bold text-success pe-0 py-3">
                          {m.receita.toLocaleString('pt-MZ')} MT
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
