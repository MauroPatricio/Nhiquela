import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faMoneyBillWave, faSave, faSpinner, faMapMarkedAlt, faGasPump, faChartLine, faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function DeliveryTariffsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pricingModel, setPricingModel] = useState('steps'); // 'steps' ou 'formula'
  const [baseFee, setBaseFee] = useState(50);
  const [pricePerKm, setPricePerKm] = useState(15);
  const [serviceFee, setServiceFee] = useState(20);
  const [driverCommissionRate, setDriverCommissionRate] = useState(15);
  const [step1Km, setStep1Km] = useState(3);
  const [step1Price, setStep1Price] = useState(80);
  const [step2Km, setStep2Km] = useState(7);
  const [step2Price, setStep2Price] = useState(120);
  const [step3Km, setStep3Km] = useState(12);
  const [step3Price, setStep3Price] = useState(180);
  const [step4Km, setStep4Km] = useState(20);
  const [step4Price, setStep4Price] = useState(250);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      const settings = data || [];
      
      settings.forEach(s => {
        if (s.key === 'delivery_pricing_model') setPricingModel(s.value);
        if (s.key === 'delivery_base_fee') setBaseFee(Number(s.value));
        if (s.key === 'delivery_price_per_km') setPricePerKm(Number(s.value));
        if (s.key === 'delivery_service_fee') setServiceFee(Number(s.value));
        if (s.key === 'driver_commission_rate') setDriverCommissionRate(Number(s.value));
        if (s.key === 'delivery_step_1_km') setStep1Km(Number(s.value));
        if (s.key === 'delivery_step_1_price') setStep1Price(Number(s.value));
        if (s.key === 'delivery_step_2_km') setStep2Km(Number(s.value));
        if (s.key === 'delivery_step_2_price') setStep2Price(Number(s.value));
        if (s.key === 'delivery_step_3_km') setStep3Km(Number(s.value));
        if (s.key === 'delivery_step_3_price') setStep3Price(Number(s.value));
        if (s.key === 'delivery_step_4_km') setStep4Km(Number(s.value));
        if (s.key === 'delivery_step_4_price') setStep4Price(Number(s.value));
      });
    } catch (error) {
      toast.error('Erro ao carregar tarifas de entrega');
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key, value, description) => {
    try {
      // Tentar atualizar primeiro, se falhar, tenta criar (ou no backend lidar com upsert)
      // Como o /settings é é POST para criar, precisamos ver se já existe.
      // Neste caso vamos enviar um é POST /settings que idealmente deve fazer upsert, ou se devolver erro tentamos PUT.
      // O código da API atual faz é POST criar, PUT atualizar por ID. 
      // Para ser seguro, criamos uma lógica de UpdateByKey:
      
      // Procurar se a setting já existe:
      const { data } = await api.get('/settings');
      const existing = data.find(s => s.key === key);
      
      if (existing) {
        await api.put(`/settings/${existing._id || existing.id}`, { key, value: String(value), description });
      } else {
        await api.post('/settings', { key, value: String(value), description });
      }
    } catch (e) {
      console.error(`Erro ao guardar ${key}`, e);
      throw e;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSetting('delivery_pricing_model', pricingModel, 'Estratégia de preço: steps (Maputo) ou formula');
      await saveSetting('delivery_base_fee', baseFee, 'Taxa Base de entrega (MZN)');
      await saveSetting('delivery_price_per_km', pricePerKm, 'Valor cobrado por Quilómetro (MZN)');
      await saveSetting('delivery_service_fee', serviceFee, 'Taxa Fixa de Serviço da Plataforma (MZN)');
      await saveSetting('driver_commission_rate', driverCommissionRate, 'Comissão da Plataforma (%)');
      await saveSetting('delivery_step_1_km', step1Km, 'Escalão 1 (Km)');
      await saveSetting('delivery_step_1_price', step1Price, 'Escalão 1 (Preço)');
      await saveSetting('delivery_step_2_km', step2Km, 'Escalão 2 (Km)');
      await saveSetting('delivery_step_2_price', step2Price, 'Escalão 2 (Preço)');
      await saveSetting('delivery_step_3_km', step3Km, 'Escalão 3 (Km)');
      await saveSetting('delivery_step_3_price', step3Price, 'Escalão 3 (Preço)');
      await saveSetting('delivery_step_4_km', step4Km, 'Escalão 4 (Km)');
      await saveSetting('delivery_step_4_price', step4Price, 'Escalão 4 (Preço)');
      
      toast.success('Configurações de Tarifas guardadas com sucesso! 🚀');
    } catch (error) {
      toast.error('Ocorreu um erro ao guardar as tarifas.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
      </div>
    );
  }

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Tarifas e Preços de Entrega</h2>
          <span className="text-muted small">Configure o algoritmo que calcula automaticamente o custo do transporte via OSRM.</span>
        </div>
        <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold" onClick={handleSave} disabled={saving}>
          {saving ? <FontAwesomeIcon icon={faSpinner} spin className="me-2" /> : <FontAwesomeIcon icon={faSave} className="me-2" />}
          Guardar Tarifas
        </button>
      </div>

      <div className="row g-4">
        {/* Coluna Esquerda: Definições */}
        <div className="col-lg-7">
          <div className="card shadow-sm-custom border-0 rounded-4 mb-4">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4">
              <h5 className="fw-bold text-dark"><FontAwesomeIcon icon={faBalanceScale} className="text-primary-custom me-2"/> Estratégia de Preços</h5>
              <p className="text-muted small m-0">Escolha o modelo de cálculo do valor das entregas aplicável a toda a plataforma.</p>
            </div>
            <div className="card-body p-4">
              <div className="d-flex gap-3 mb-4">
                <div 
                  className={`border rounded-4 p-3 flex-fill text-center cursor-pointer transition-all ${pricingModel === 'steps' ? 'bg-primary-subtle border-primary' : 'bg-light border-light'}`}
                  onClick={() => setPricingModel('steps')}
                  style={{ cursor: 'pointer' }}
                >
                  <FontAwesomeIcon icon={faChartLine} size="2x" className={pricingModel === 'steps' ? 'text-primary-custom mb-2' : 'text-muted mb-2'} />
                  <h6 className="fw-bold m-0">Modelo Escalões</h6>
                  <span className="text-muted small">Recomendado para Maputo</span>
                </div>
                
                <div 
                  className={`border rounded-4 p-3 flex-fill text-center cursor-pointer transition-all ${pricingModel === 'formula' ? 'bg-primary-subtle border-primary' : 'bg-light border-light'}`}
                  onClick={() => setPricingModel('formula')}
                  style={{ cursor: 'pointer' }}
                >
                  <FontAwesomeIcon icon={faGasPump} size="2x" className={pricingModel === 'formula' ? 'text-primary-custom mb-2' : 'text-muted mb-2'} />
                  <h6 className="fw-bold m-0">Fórmula Variável</h6>
                  <span className="text-muted small">Cálculo fixo ao Km</span>
                </div>
              </div>

              <hr className="text-muted opacity-25" />

              <h5 className="fw-bold text-dark mt-4 mb-3"><FontAwesomeIcon icon={faMoneyBillWave} className="text-success me-2"/> Variáveis Base</h5>
              
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-muted">Taxa Base Inicial (MZN)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faMoneyBillWave} className="text-muted"/></span>
                    <input type="number" className="form-control bg-light border-0 py-2" value={baseFee} onChange={(e) => setBaseFee(e.target.value)} />
                  </div>
                  <div className="form-text small">Valor mínimo para aceitar qualquer entrega.</div>
                </div>
                
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-muted">Valor por Quilómetro (MZN/Km)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faMapMarkedAlt} className="text-muted"/></span>
                    <input type="number" className="form-control bg-light border-0 py-2" value={pricePerKm} onChange={(e) => setPricePerKm(e.target.value)} />
                  </div>
                  <div className="form-text small">Custo por Km de distância real (usado na Fórmula e no Escalão &gt;20km).</div>
                </div>
                
                <div className="col-md-6 mt-3">
                  <label className="form-label fw-bold small text-muted">Taxa Fixa de Serviço (MZN)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faTruck} className="text-muted"/></span>
                    <input type="number" className="form-control bg-light border-0 py-2" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} />
                  </div>
                  <div className="form-text small">Comissão ou taxa fixa adicional (aplica-se apenas à Fórmula).</div>
                </div>

                <div className="col-md-6 mt-3">
                  <label className="form-label fw-bold small text-muted">Comissão da Plataforma (%)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faBalanceScale} className="text-muted"/></span>
                    <input type="number" className="form-control bg-light border-0 py-2" value={driverCommissionRate} onChange={(e) => setDriverCommissionRate(e.target.value)} />
                  </div>
                  <div className="form-text small">Percentagem cobrada ao motorista (ex: 15).</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Simulação e Resumo */}
        <div className="col-lg-5">
          <div className="card shadow-sm-custom border-0 rounded-4 bg-dark text-white mb-4 overflow-hidden">
            <div className="position-absolute top-0 end-0 opacity-10 p-4">
              <FontAwesomeIcon icon={faChartLine} size="6x" />
            </div>
            <div className="card-body p-4 position-relative">
              <h5 className="fw-bold mb-3 text-warning">Simulador de Resumo</h5>
              
              {pricingModel === 'steps' ? (
                <>
                  <p className="text-light opacity-75 small mb-4">No modelo de escalões competitivo, a tarifa é é cobrada por zonas de quilometragem da seguinte forma:</p>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold d-flex align-items-center">0 a <input type="number" className="form-control form-control-sm bg-dark text-white border-secondary mx-2 text-center" style={{width: '60px'}} value={step1Km} onChange={(e)=>setStep1Km(e.target.value)} /> km:</span>
                    <div className="d-flex align-items-center">
                      <input type="number" className="form-control form-control-sm bg-dark text-warning border-warning fw-bold text-end" style={{width: '80px'}} value={step1Price} onChange={(e)=>setStep1Price(e.target.value)} />
                      <span className="text-warning fw-bold ms-2">MZN</span>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold d-flex align-items-center">{step1Km} a <input type="number" className="form-control form-control-sm bg-dark text-white border-secondary mx-2 text-center" style={{width: '60px'}} value={step2Km} onChange={(e)=>setStep2Km(e.target.value)} /> km:</span>
                    <div className="d-flex align-items-center">
                      <input type="number" className="form-control form-control-sm bg-dark text-warning border-warning fw-bold text-end" style={{width: '80px'}} value={step2Price} onChange={(e)=>setStep2Price(e.target.value)} />
                      <span className="text-warning fw-bold ms-2">MZN</span>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold d-flex align-items-center">{step2Km} a <input type="number" className="form-control form-control-sm bg-dark text-white border-secondary mx-2 text-center" style={{width: '60px'}} value={step3Km} onChange={(e)=>setStep3Km(e.target.value)} /> km:</span>
                    <div className="d-flex align-items-center">
                      <input type="number" className="form-control form-control-sm bg-dark text-warning border-warning fw-bold text-end" style={{width: '80px'}} value={step3Price} onChange={(e)=>setStep3Price(e.target.value)} />
                      <span className="text-warning fw-bold ms-2">MZN</span>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold d-flex align-items-center">{step3Km} a <input type="number" className="form-control form-control-sm bg-dark text-white border-secondary mx-2 text-center" style={{width: '60px'}} value={step4Km} onChange={(e)=>setStep4Km(e.target.value)} /> km:</span>
                    <div className="d-flex align-items-center">
                      <input type="number" className="form-control form-control-sm bg-dark text-warning border-warning fw-bold text-end" style={{width: '80px'}} value={step4Price} onChange={(e)=>setStep4Price(e.target.value)} />
                      <span className="text-warning fw-bold ms-2">MZN</span>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between pt-2 border-top border-secondary mt-2">
                    <span className="fw-bold">Acima de {step4Km} km:</span>
                    <span className="text-warning fw-bold">{step4Price} + {pricePerKm} MZN/km</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-light opacity-75 small mb-4">No modelo de fórmula variável matemática, a tarifa final cresce exatamente com o número de quilómetros rodados:</p>
                  
                  <div className="bg-secondary bg-opacity-25 p-3 rounded-3 mb-3 text-center">
                    <span className="d-block small text-light opacity-75 mb-1">Preço Final =</span>
                    <span className="fs-5 fw-bold text-warning">{baseFee} MT + (Km × {pricePerKm} MT) + {serviceFee} MT</span>
                  </div>
                  
                  <h6 className="fw-bold mt-4 mb-2 opacity-75">Simulações Rápidas:</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <span>5 km (Baixa-Polana):</span>
                    <span className="text-warning fw-bold">{Number(baseFee) + (5 * Number(pricePerKm)) + Number(serviceFee)} MZN</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>12 km (Baixa-Zimpeto):</span>
                    <span className="text-warning fw-bold">{Number(baseFee) + (12 * Number(pricePerKm)) + Number(serviceFee)} MZN</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>18 km (Baixa-Matola):</span>
                    <span className="text-warning fw-bold">{Number(baseFee) + (18 * Number(pricePerKm)) + Number(serviceFee)} MZN</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .bg-primary-subtle { background-color: #f3e8ff !important; border-color: #8a2be2 !important; }
        .shadow-sm-custom { box-shadow: 0 4px 20px rgba(0,0,0,0.03) !important; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
