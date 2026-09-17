import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTruck, faMapMarkerAlt, faArrowRight, faSearch, faSpinner, faCheckCircle,
  faClock, faWallet, faPhone, faExclamationTriangle, faShieldAlt, faRedo,
  faWrench, faBoxes, faStar, faUserCheck, faSync, faCar, faLocationArrow,
  faLayerGroup, faMoneyBillWave, faUser, faRoute, faTag, faBuilding,
  faLock, faSignInAlt
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectUser } from '../store/features/userSlice';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../api';

const CITIES_PRESETS_ORIGIN = [
  { name: 'Porto de Maputo - Terminal de Contentores', lat: -25.9692, lng: 32.5732, tag: 'Porto' },
  { name: 'Matola - Zona Industrial & Logística', lat: -25.9619, lng: 32.4589, tag: 'Industrial' },
  { name: 'Beira - Cais 4 & Armazéns Portuários', lat: -19.8436, lng: 34.8389, tag: 'Porto' },
  { name: 'Nampula - Centro Logístico do Norte', lat: -15.1165, lng: 39.2666, tag: 'Norte' },
];

const CITIES_PRESETS_DESTINATION = [
  { name: 'Porto da Beira - Cais de Cargas', lat: -19.8436, lng: 34.8389, tag: 'Terminal' },
  { name: 'Nacala - Porto de Águas Profundas', lat: -14.5625, lng: 40.6728, tag: 'Nacala' },
  { name: 'Tete - Corredor de Pesados Moatize', lat: -16.1564, lng: 33.5862, tag: 'Mineração' },
  { name: 'Chimoio - Centro Agro-Industrial', lat: -19.1164, lng: 33.4833, tag: 'Agrícola' },
];

export default function ServicesScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userInfo = useSelector(selectUser);

  // Estados de Prestadores e Categorias
  const [subcategories, setSubcategories] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Formulário de Solicitação (Origem & Destino)
  const [origin, setOrigin] = useState('Porto de Maputo - Terminal de Contentores');
  const [destination, setDestination] = useState('Matola - Zona Industrial & Logística');
  const [originCoord, setOriginCoord] = useState({ lat: -25.9692, lng: 32.5732 });
  const [destCoord, setDestCoord] = useState({ lat: -25.9619, lng: 32.4589 });
  const [goodType, setGoodType] = useState('Carga Geral & Encomendas');
  const [reason, setReason] = useState('');
  const [clientName, setClientName] = useState(userInfo?.name || '');
  const [clientPhone, setClientPhone] = useState(userInfo?.phoneNumber || '');
  const [paymentMethod, setPaymentMethod] = useState('Em dinheiro');
  const [activePaymentMethods, setActivePaymentMethods] = useState([]);
  const [cargoTypes, setCargoTypes] = useState([]);

  // Cálculo de Rota & Estimativa
  const [estimatedDistance, setEstimatedDistance] = useState(14.5);
  const [estimatedPrice, setEstimatedPrice] = useState(1453);
  const [estimatedTime, setEstimatedTime] = useState('25-35 min');
  const [hasSimulated, setHasSimulated] = useState(false);

  // Integração Google Places API
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [originPredictions, setOriginPredictions] = useState([]);
  const [destPredictions, setDestPredictions] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const autocompleteServiceRef = useRef(null);
  const geocoderRef = useRef(null);

  // Carregar Google Places API Script
  useEffect(() => {
    const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBipLnxa_lqw1IUKqQovRe_oQpeVvjGZ4s";
    
    if (window.google?.maps?.places) {
      setIsGoogleLoaded(true);
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      geocoderRef.current = new window.google.maps.Geocoder();
      return;
    }

    const scriptId = 'google-maps-places-script';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&language=pt`;
      script.async = true;
      script.onload = () => {
        setIsGoogleLoaded(true);
        if (window.google?.maps?.places) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
          geocoderRef.current = new window.google.maps.Geocoder();
        }
      };
      document.head.appendChild(script);
    } else {
      setIsGoogleLoaded(true);
      if (window.google?.maps?.places) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        geocoderRef.current = new window.google.maps.Geocoder();
      }
    }
  }, []);

  // 1. Carregar Métodos de Pagamento Ativos da Plataforma
  useEffect(() => {
    api.get('/payment-methods')
      .catch(() => api.get('/payments'))
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.data || data?.paymentMethods || []);
        const activeList = list.filter(pm => pm.status === 'Ativo' || pm.status === undefined || pm.isActive !== false);
        if (activeList.length > 0) {
          setActivePaymentMethods(activeList);
          setPaymentMethod(activeList[0].name || activeList[0].type || 'Em dinheiro');
        }
      })
      .catch((err) => console.log('Erro ao carregar métodos de pagamento ativos:', err));

    api.get('/cargo-types?status=Ativo')
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setCargoTypes(data);
          setGoodType(data[0].name);
        }
      })
      .catch((err) => console.log('Erro ao carregar tipos de carga:', err));
  }, []);

  // 2. Carregar Subcategorias de Serviço e Prestadores do tipo SERVICE
  useEffect(() => {
    const fetchServiceCatalog = async () => {
      try {
        setLoadingCatalog(true);

        const [subcatRes, providersRes] = await Promise.all([
          api.get('/provider-subcategories?type=SERVICE').catch(() => ({ data: [] })),
          api.get('/providers?type=SERVICE').catch(() => ({ data: { providers: [] } }))
        ]);

        const rawSubcats = Array.isArray(subcatRes.data) ? subcatRes.data : [];
        // Filtrar estritamente apenas subcategorias do tipo SERVICE (excluindo lojas BUSINESS como MiniMercado)
        const serviceSubcats = rawSubcats.filter((sub) => {
          const nameUpper = (sub.name || '').toUpperCase();
          const ptNameUpper = (sub.providerTypeId?.name || '').toUpperCase();
          const clsNameUpper = (sub.providerTypeId?.classificationId?.name || '').toUpperCase();
          
          const isStoreBusiness = nameUpper.includes('MINIMERCADO') || 
                                  nameUpper.includes('SUPERMERCADO') || 
                                  nameUpper.includes('FARMÁCIA') || 
                                  nameUpper.includes('BOTTLE') || 
                                  ptNameUpper.includes('SUPERMERCADO') || 
                                  clsNameUpper.includes('BUSINESS');
          return !isStoreBusiness;
        });

        setSubcategories(serviceSubcats);
        if (serviceSubcats.length > 0) {
          setSelectedSubcat(serviceSubcats[0]);
        }

        const provData = providersRes.data?.providers || (Array.isArray(providersRes.data) ? providersRes.data : []);
        setServiceProviders(provData);
      } catch (err) {
        console.error('Erro ao carregar catálogo de serviços:', err);
      } finally {
        setLoadingCatalog(false);
      }
    };

    fetchServiceCatalog();
  }, []);

  // 2. Conexão Socket.io para atualizações em tempo real no celular do motorista (nhiqueladriver)
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (userInfo?._id) {
        socket.emit('joinRoom', userInfo._id);
      }
    });

    socket.on('tripAccepted', (data) => {
      const trip = data?.order || data;
      setActiveRequest(trip);
      setAssignedDriver(trip.deliveryman || data.driver || { name: 'Motorista Nhiquela', phoneNumber: '841234567' });
      clearInterval(countdownIntervalRef.current);
      toast.success('🎉 Prestador de serviço aceitou o seu pedido e está a caminho!');
    });

    socket.on('orderUpdated', (data) => {
      const updated = data?.order || data;
      if (activeRequest && (updated._id === activeRequest._id || updated.id === activeRequest.id)) {
        setActiveRequest(updated);
        if (updated.status === 'Pedido aceite' || updated.status === 'Em andamento' || updated.status === 'Em trânsito') {
          setAssignedDriver(updated.deliveryman || assignedDriver);
        }
      }
    });

    return () => {
      socket.disconnect();
      clearInterval(countdownIntervalRef.current);
    };
  }, [userInfo, activeRequest, assignedDriver]);

  // Recalcular preço estimado com base na distância e subcategoria
  useEffect(() => {
    let basePrice = selectedSubcat?.serviceFee || 800;
    let distPrice = estimatedDistance * 45;
    let total = Math.max(500, Math.round(basePrice + distPrice));
    setEstimatedPrice(total);
  }, [estimatedDistance, selectedSubcat]);

  // Selecionar cidade de origem preset
  const handleSelectOrigin = (city) => {
    setOrigin(city.name);
    setOriginCoord({ lat: city.lat, lng: city.lng });
    recalculateDistance(city.lat, city.lng, destCoord.lat, destCoord.lng);
    setHasSimulated(true);
  };

  // Selecionar cidade de destino preset
  const handleSelectDestination = (city) => {
    setDestination(city.name);
    setDestCoord({ lat: city.lat, lng: city.lng });
    recalculateDistance(originCoord.lat, originCoord.lng, city.lat, city.lng);
    setHasSimulated(true);
  };

  const recalculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = Math.max(3.5, Number((R * c).toFixed(1)));
    setEstimatedDistance(dist);
    setEstimatedTime(`${Math.round(dist * 1.8 + 12)}-${Math.round(dist * 2.2 + 18)} min`);
  };

  // Buscar previsões de locais no Google Places para Origem
  const handleOriginInputChange = (text) => {
    setOrigin(text);
    if (!text.trim() || text.length < 2) {
      setOriginPredictions([]);
      setShowOriginDropdown(false);
      return;
    }

    if (autocompleteServiceRef.current && window.google?.maps?.places) {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: text,
          componentRestrictions: { country: 'mz' }
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setOriginPredictions(predictions);
            setShowOriginDropdown(true);
          }
        }
      );
    }
  };

  // Buscar previsões de locais no Google Places para Destino
  const handleDestInputChange = (text) => {
    setDestination(text);
    if (!text.trim() || text.length < 2) {
      setDestPredictions([]);
      setShowDestDropdown(false);
      return;
    }

    if (autocompleteServiceRef.current && window.google?.maps?.places) {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: text,
          componentRestrictions: { country: 'mz' }
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setDestPredictions(predictions);
            setShowDestDropdown(true);
          }
        }
      );
    }
  };

  // Selecionar sugestão do Google Places para Origem
  const handleSelectOriginPrediction = (prediction) => {
    const address = prediction.description;
    setOrigin(address);
    setShowOriginDropdown(false);

    if (geocoderRef.current) {
      geocoderRef.current.geocode({ placeId: prediction.place_id }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          setOriginCoord({ lat, lng });
          recalculateDistance(lat, lng, destCoord.lat, destCoord.lng);
          setHasSimulated(true);
        }
      });
    }
  };

  // Selecionar sugestão do Google Places para Destino
  const handleSelectDestPrediction = (prediction) => {
    const address = prediction.description;
    setDestination(address);
    setShowDestDropdown(false);

    if (geocoderRef.current) {
      geocoderRef.current.geocode({ placeId: prediction.place_id }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          setDestCoord({ lat, lng });
          recalculateDistance(originCoord.lat, originCoord.lng, lat, lng);
          setHasSimulated(true);
        }
      });
    }
  };

  // Trata a simulação manual da rota e cálculo de valores
  const handleSimulateRoute = () => {
    if (!origin.trim() || !destination.trim()) {
      toast.warning('Por favor insira a origem e o destino para calcular a simulação.');
      return;
    }
    recalculateDistance(originCoord.lat, originCoord.lng, destCoord.lat, destCoord.lng);
    setHasSimulated(true);
    toast.success('Simulação de cotação realizada!');
  };

  // Enviar Solicitação ao Celular dos Prestadores via API & Socket
  const handleCreateServiceRequest = async (e) => {
    e.preventDefault();

    if (!userInfo || !userInfo.token) {
      toast.info('Sessão necessária: Por favor inicie sessão na Nhiquela para solicitar o serviço.');
      navigate('/signin?redirect=/shop/services');
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      toast.warning('Por favor insira o local de Origem e Destino do serviço.');
      return;
    }

    if (!clientName.trim() || !clientPhone.trim()) {
      toast.warning('Por favor informe o seu nome e número de contacto.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: clientName,
        phoneNumber: clientPhone,
        goodType: goodType || 'Carga Geral & Encomendas',
        transportType: selectedSubcat?.name || 'Camião de Carga',
        serviceId: selectedSubcat?._id,
        deliverCity: 'Maputo',
        reason: reason || `Solicitação de ${selectedSubcat?.name || 'Serviço'}`,
        origin: origin,
        destination: destination,
        originDetails: {
          address: origin,
          lat: originCoord.lat,
          lng: originCoord.lng
        },
        destinationDetails: {
          address: destination,
          lat: destCoord.lat,
          lng: destCoord.lng
        },
        deliveryPrice: estimatedPrice,
        paymentMethod: paymentMethod,
        isNegotiationAllowed: selectedSubcat?.allowNegotiation || true
      };

      const config = userInfo?.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
      const { data } = await api.post('/request-service', payload, config);

      const createdOrder = data.order || data.requestService || data;
      setActiveRequest(createdOrder);
      setSearchCountdown(60);
      toast.success('🚀 Pedido enviado ao celular dos prestadores mais próximos!');

      // Iniciar contagem regressiva do radar
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setSearchCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Erro ao enviar solicitação de serviço:', error);
      toast.error(error.response?.data?.message || 'Não foi possível enviar a solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequest) return;
    try {
      const config = userInfo?.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
      await api.put(`/request-service/${activeRequest._id || activeRequest.id}/cancel`, { message: 'Cancelado pelo cliente na web' }, config);
      setActiveRequest(null);
      setAssignedDriver(null);
      clearInterval(countdownIntervalRef.current);
      toast.info('Solicitação cancelada.');
    } catch {
      setActiveRequest(null);
    }
  };

  return (
    <div className="pb-5 min-vh-100" style={{ backgroundColor: '#F8FAFC' }}>
      
      {/* BANNER HERO CABEÇALHO PREMIUM */}
      <section
        className="text-white py-5 position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #4338CA 100%)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)'
        }}
      >
        <div className="container position-relative py-3" style={{ zIndex: 2 }}>
          <div className="row align-items-center">
            <div className="col-lg-8">
              <span
                className="badge rounded-pill px-3 py-2 fw-bold mb-3 d-inline-flex align-items-center gap-2 shadow-sm"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFF' }}
              >
                <FontAwesomeIcon icon={faTruck} style={{ color: '#A855F7' }} /> Central de Serviços & Fretes Nhiquela
              </span>
              <h1 className="display-5 fw-extrabold text-white mb-3" style={{ letterSpacing: '-1px' }}>
                Solicitar <span style={{ color: '#A855F7' }}>Serviço</span>
              </h1>
              <p className="lead mb-0 text-slate-300" style={{ color: '#CBD5E1', maxWidth: '680px', fontSize: '1.05rem' }}>
                Conexão em tempo real entre Clientes e Prestadores de Serviço em Moçambique. Defina Origem, Destino e receba atendimento diretamente no telemóvel dos prestadores.
              </p>
            </div>
            <div className="col-lg-4 text-center text-lg-end mt-4 mt-lg-0">
              <div
                className="p-3.5 rounded-4 d-inline-block text-start shadow-lg"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  minWidth: '260px'
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex justify-content-center align-items-center text-white"
                    style={{ width: '46px', height: '46px', background: 'linear-gradient(135deg, #7F00FF 0%, #6800D3 100%)' }}
                  >
                    <FontAwesomeIcon icon={faUserCheck} size="lg" />
                  </div>
                  <div>
                    <h6 className="m-0 fw-bold text-white fs-6">Prestadores Online</h6>
                    <small style={{ color: '#A7F3D0', fontWeight: 600 }}>● Despacho Instantâneo</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL: FORMULÁRIO E PAINEL LATERAL */}
      <div className="container py-5">
        <div className="row g-4">
          
          {/* COLUNA ESQUERDA: FORMULÁRIO DE SOLICITAÇÃO MODERNO */}
          <div className="col-lg-7">
            <div
              className="bg-white rounded-4 p-4 p-md-5 shadow-sm position-relative"
              style={{ border: '1px solid rgba(226, 232, 240, 0.9)' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom">
                <h4 className="fw-extrabold text-dark m-0 d-flex align-items-center gap-2.5 fs-5">
                  <FontAwesomeIcon icon={faRoute} style={{ color: '#7F00FF' }} />
                  Solicitar Serviço
                </h4>
              
              </div>

              <form onSubmit={handleCreateServiceRequest}>
                
                {/* 1. SELEÇÃO DA SUBCATEGORIA DE SERVIÇO */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase tracking-wider d-flex align-items-center gap-2">
                    <span className="rounded-circle text-white d-inline-flex justify-content-center align-items-center" style={{ width: '22px', height: '22px', backgroundColor: '#7F00FF', fontSize: '11px' }}>1</span>
                    Selecione a Subcategoria do Serviço
                  </label>
                  
                  {loadingCatalog ? (
                    <div className="text-center py-3 text-muted">
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" style={{ color: '#7F00FF' }} /> Carregando categorias de serviço...
                    </div>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {subcategories.map((subcat) => {
                        const isSelected = selectedSubcat?._id === subcat._id;
                        return (
                          <button
                            key={subcat._id}
                            type="button"
                            className="btn rounded-3 px-3.5 py-2.5 fw-bold text-nowrap transition-all small d-flex align-items-center gap-2 border-0"
                            style={{
                              backgroundColor: isSelected ? '#7F00FF' : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#334155',
                              boxShadow: isSelected ? '0 4px 14px rgba(127, 0, 255, 0.3)' : 'none',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => setSelectedSubcat(subcat)}
                          >
                            <span>{subcat.iconUrl || '🚚'}</span>
                            <span>{subcat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. LOCAL DE ORIGEM (PARTIDA / COLETA) */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase tracking-wider d-flex align-items-center gap-2">
                    <span className="rounded-circle text-white d-inline-flex justify-content-center align-items-center" style={{ width: '22px', height: '22px', backgroundColor: '#10B981', fontSize: '11px' }}>2</span>
                    Local de Origem (Partida / Coleta)
                  </label>
                  
                  <div className="position-relative">
                    <div className="input-group shadow-sm rounded-3 overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
                      <span className="input-group-text bg-white border-0 px-3" style={{ color: '#10B981' }}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} size="lg" />
                      </span>
                      <input
                        type="text"
                        className="form-control border-0 py-2.5 text-dark fw-medium"
                        placeholder="Digite a Origem (ex: Porto de Maputo, Matola Zona Industrial...)"
                        value={origin}
                        onChange={(e) => handleOriginInputChange(e.target.value)}
                        onFocus={() => originPredictions.length > 0 && setShowOriginDropdown(true)}
                        required
                        style={{ fontSize: '14px', backgroundColor: '#FFFFFF' }}
                      />
                      {isGoogleLoaded && (
                        <span className="input-group-text bg-white border-0 text-muted px-2.5" style={{ fontSize: '10.5px' }} title="Integrado com Google Places API">
                          ⚡ Google Places
                        </span>
                      )}
                    </div>

                    {/* SUGESTÕES DO GOOGLE PLACES API PARA ORIGEM */}
                    {showOriginDropdown && originPredictions.length > 0 && (
                      <div
                        className="list-group shadow-lg position-absolute w-100 mt-1 rounded-3 overflow-hidden border-0"
                        style={{ zIndex: 1000, backgroundColor: '#FFFFFF', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                      >
                        {originPredictions.map((pred) => (
                          <button
                            key={pred.place_id}
                            type="button"
                            className="list-group-item list-group-item-action border-0 py-2.5 px-3 d-flex align-items-center gap-2 text-start"
                            onClick={() => handleSelectOriginPrediction(pred)}
                            style={{ fontSize: '13px' }}
                          >
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: '#10B981', flexShrink: 0 }} />
                            <div>
                              <div className="fw-bold text-dark">{pred.structured_formatting?.main_text || pred.description}</div>
                              <small className="text-muted d-block" style={{ fontSize: '11px' }}>{pred.structured_formatting?.secondary_text || ''}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PRESETS RÁPIDOS DE ORIGEM */}
                  <div className="d-flex flex-wrap align-items-center gap-1.5 mt-2.5">
                    <span className="text-muted fw-bold me-1" style={{ fontSize: '11px' }}>Pontos frequentes:</span>
                    {CITIES_PRESETS_ORIGIN.map((city, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn btn-sm rounded-pill px-2.5 py-1 fw-medium border-0"
                        style={{
                          fontSize: '11px',
                          backgroundColor: origin === city.name ? 'rgba(16, 185, 129, 0.12)' : '#F1F5F9',
                          color: origin === city.name ? '#059669' : '#475569',
                          border: origin === city.name ? '1px solid rgba(16, 185, 129, 0.3)' : 'none'
                        }}
                        onClick={() => handleSelectOrigin(city)}
                      >
                        📍 {city.name.split(' - ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. LOCAL DE DESTINO (CHEGADA / ENTREGA) */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase tracking-wider d-flex align-items-center gap-2">
                    <span className="rounded-circle text-white d-inline-flex justify-content-center align-items-center" style={{ width: '22px', height: '22px', backgroundColor: '#EF4444', fontSize: '11px' }}>3</span>
                    Local de Destino (Chegada / Entrega)
                  </label>
                  
                  <div className="position-relative">
                    <div className="input-group shadow-sm rounded-3 overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
                      <span className="input-group-text bg-white border-0 px-3" style={{ color: '#EF4444' }}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} size="lg" />
                      </span>
                      <input
                        type="text"
                        className="form-control border-0 py-2.5 text-dark fw-medium"
                        placeholder="Digite o Destino (ex: Beira Terminal, Nacala, Tete...)"
                        value={destination}
                        onChange={(e) => handleDestInputChange(e.target.value)}
                        onFocus={() => destPredictions.length > 0 && setShowDestDropdown(true)}
                        required
                        style={{ fontSize: '14px', backgroundColor: '#FFFFFF' }}
                      />
                      {isGoogleLoaded && (
                        <span className="input-group-text bg-white border-0 text-muted px-2.5" style={{ fontSize: '10.5px' }} title="Integrado com Google Places API">
                          ⚡ Google Places
                        </span>
                      )}
                    </div>

                    {/* SUGESTÕES DO GOOGLE PLACES API PARA DESTINO */}
                    {showDestDropdown && destPredictions.length > 0 && (
                      <div
                        className="list-group shadow-lg position-absolute w-100 mt-1 rounded-3 overflow-hidden border-0"
                        style={{ zIndex: 1000, backgroundColor: '#FFFFFF', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                      >
                        {destPredictions.map((pred) => (
                          <button
                            key={pred.place_id}
                            type="button"
                            className="list-group-item list-group-item-action border-0 py-2.5 px-3 d-flex align-items-center gap-2 text-start"
                            onClick={() => handleSelectDestPrediction(pred)}
                            style={{ fontSize: '13px' }}
                          >
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: '#EF4444', flexShrink: 0 }} />
                            <div>
                              <div className="fw-bold text-dark">{pred.structured_formatting?.main_text || pred.description}</div>
                              <small className="text-muted d-block" style={{ fontSize: '11px' }}>{pred.structured_formatting?.secondary_text || ''}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PRESETS RÁPIDOS DE DESTINO */}
                  <div className="d-flex flex-wrap align-items-center gap-1.5 mt-2.5">
                    <span className="text-muted fw-bold me-1" style={{ fontSize: '11px' }}>Destinos populares:</span>
                    {CITIES_PRESETS_DESTINATION.map((city, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn btn-sm rounded-pill px-2.5 py-1 fw-medium border-0"
                        style={{
                          fontSize: '11px',
                          backgroundColor: destination === city.name ? 'rgba(239, 68, 68, 0.12)' : '#F1F5F9',
                          color: destination === city.name ? '#DC2626' : '#475569',
                          border: destination === city.name ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'
                        }}
                        onClick={() => handleSelectDestination(city)}
                      >
                        🏁 {city.name.split(' - ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TIPO DE CARGA & MÉTODO DE PAGAMENTO */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark small text-uppercase tracking-wider">Tipo de Carga / Equipamento</label>
                    <select
                      className="form-select py-2.5 text-dark fw-medium rounded-3"
                      value={goodType}
                      onChange={(e) => setGoodType(e.target.value)}
                      style={{ fontSize: '13.5px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}
                    >
                      {cargoTypes.length > 0 ? (
                        cargoTypes.map((ct) => (
                          <option key={ct._id || ct.name} value={ct.name}>
                            {ct.icon ? `${ct.icon} ` : ''}{ct.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Carga Geral & Encomendas">📦 Carga Geral & Encomendas</option>
                          <option value="Contentores & Mercadoria Portuária">🏗️ Contentores & Mercadoria Portuária</option>
                          <option value="Produtos Agrícolas nas Machambas">🌾 Produtos Agrícolas nas Machambas</option>
                          <option value="Maquinaria Pesada & Construção">🚜 Maquinaria Pesada & Construção</option>
                          <option value="Mudanças Residenciais / Escritório">🛋️ Mudanças Residenciais / Escritório</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark small text-uppercase tracking-wider">Método de Pagamento</label>
                    <select
                      className="form-select py-2.5 text-dark fw-medium rounded-3"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ fontSize: '13.5px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}
                    >
                      {activePaymentMethods.length > 0 ? (
                        activePaymentMethods.map((pm) => (
                          <option key={pm._id || pm.id || pm.name} value={pm.name || pm.type}>
                            {pm.icon ? `${pm.icon} ` : ''}{pm.name || pm.type} {pm.description ? `— ${pm.description}` : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Em dinheiro">💰 Em dinheiro (Pagamento no Local)</option>
                          <option value="Carteira digital">📱 Carteira Digital Nhiquela</option>
                          <option value="Transferência móvel">💸 Transferência Móvel (M-Pesa / e-Mola)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* DADOS DO CLIENTE */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark small text-uppercase tracking-wider">Seu Nome / Empresa</label>
                    <input
                      type="text"
                      className="form-control py-2.5 rounded-3 fw-medium"
                      placeholder="Nome completo"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      style={{ fontSize: '13.5px', border: '1px solid #E2E8F0' }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark small text-uppercase tracking-wider">Telefone para Contacto</label>
                    <input
                      type="text"
                      className="form-control py-2.5 rounded-3 fw-medium"
                      placeholder="ex: 841234567"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                      style={{ fontSize: '13.5px', border: '1px solid #E2E8F0' }}
                    />
                  </div>
                </div>

                {/* CARD DE ESTIMATIVA DE PREÇO & DISTÂNCIA PREMIUM (APENAS NA SIMULAÇÃO REAL) */}
                {hasSimulated && (
                  <div
                    className="p-4 rounded-4 mb-4 position-relative overflow-hidden shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderLeft: '5px solid #7F00FF'
                    }}
                  >
                    <div className="row align-items-center">
                      <div className="col-sm-7 mb-3 mb-sm-0">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FontAwesomeIcon icon={faRoute} style={{ color: '#7F00FF' }} />
                          <span className="text-slate-600 small fw-bold text-uppercase tracking-wide" style={{ fontSize: '11px', color: '#64748B' }}>
                            Estimativa da Rota (Simulação Real)
                          </span>
                        </div>
                        <div className="d-flex flex-column gap-0.5">
                          <span className="text-dark fw-semibold" style={{ fontSize: '13.5px' }}>
                            Distância Estimada: <strong style={{ color: '#0F172A' }}>{estimatedDistance} km</strong>
                          </span>
                          <span className="text-dark fw-semibold" style={{ fontSize: '13.5px' }}>
                            Tempo Estimado (ETA): <strong style={{ color: '#0F172A' }}>{estimatedTime}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="col-sm-5 text-sm-end">
                        <small className="text-muted d-block fw-bold" style={{ fontSize: '11px' }}>Preço Estimado do Serviço</small>
                        <h2 className="fw-black m-0" style={{ color: '#7F00FF', letterSpacing: '-0.5px' }}>
                          {estimatedPrice.toLocaleString('pt-PT')} MT
                        </h2>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOTÃO SUBMIT OU CARD DE SESSÃO NECESSÁRIA */}
                {!userInfo ? (
                  <div
                    className="p-3 p-md-3.5 rounded-4 shadow-sm d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-2"
                    style={{
                      backgroundColor: '#F5F3FF',
                      border: '1px solid #DDD6FE',
                      borderRadius: '20px'
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0 shadow-sm"
                        style={{
                          width: '46px',
                          height: '46px',
                          backgroundColor: '#7F00FF'
                        }}
                      >
                        <FontAwesomeIcon icon={faLock} size="lg" />
                      </div>
                      <div>
                        <h6 className="fw-bold text-dark m-0 mb-1" style={{ fontSize: '15px' }}>
                          Sessão Necessária
                        </h6>
                        <p className="text-secondary small m-0" style={{ fontSize: '13px', lineHeight: '1.45' }}>
                          Para solicitar um serviço e acompanhar o prestador em tempo real, por favor inicie sessão na sua conta.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/signin?redirect=/shop/services')}
                      className="btn text-white fw-bold px-4 py-2.5 rounded-pill d-inline-flex align-items-center justify-content-center gap-2 border-0 flex-shrink-0 shadow-sm align-self-stretch align-self-sm-auto"
                      style={{
                        backgroundColor: '#7F00FF',
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6800D3'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7F00FF'; }}
                    >
                      <FontAwesomeIcon icon={faSignInAlt} />
                      <span>Entrar</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn w-100 py-3.5 rounded-pill fw-extrabold text-white shadow-lg border-0 d-flex align-items-center justify-content-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #7F00FF 0%, #5B00B7 100%)',
                      fontSize: '16px',
                      boxShadow: '0 8px 24px rgba(127, 0, 255, 0.35)',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin /> Enviando ao Celular dos Prestadores...
                      </>
                    ) : (
                      <>
                        <span>Enviar Solicitação ao Celular dos Prestadores</span>
                        <FontAwesomeIcon icon={faArrowRight} />
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* COLUNA DIREITA: RADAR EM TEMPO REAL & PRESTADORES */}
          <div className="col-lg-5">
            
            {/* RADAR DE DESPACHO EM TEMPO REAL */}
            {activeRequest && (
              <div
                className="card border-0 mb-4 shadow-xl rounded-4 overflow-hidden position-relative"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 12px 32px rgba(127, 0, 255, 0.15)',
                  border: '1px solid rgba(127, 0, 255, 0.2)'
                }}
              >
                <div
                  className="card-header text-white p-3.5 d-flex justify-content-between align-items-center"
                  style={{ background: 'linear-gradient(135deg, #7F00FF 0%, #5B00B7 100%)' }}
                >
                  <h6 className="m-0 fw-bold d-flex align-items-center gap-2 fs-6">
                    <FontAwesomeIcon icon={faSync} spin={searchCountdown > 0 && !assignedDriver} />
                    {assignedDriver ? '🎉 Prestador Encontrado!' : '🔎 Buscando Prestadores Próximos...'}
                  </h6>
                  {!assignedDriver && (
                    <span className="badge rounded-pill fw-bold text-dark bg-white px-2.5 py-1" style={{ fontSize: '11px' }}>
                      {searchCountdown}s
                    </span>
                  )}
                </div>

                <div className="card-body p-4 text-center">
                  {assignedDriver ? (
                    <div>
                      <div
                        className="rounded-circle p-3 mx-auto mb-3 d-flex justify-content-center align-items-center text-emerald-600 shadow-sm"
                        style={{ width: '64px', height: '64px', backgroundColor: '#D1FAE5', color: '#059669' }}
                      >
                        <FontAwesomeIcon icon={faUserCheck} size="2x" />
                      </div>
                      <h5 className="fw-extrabold text-black mb-1">{assignedDriver.name || 'Motorista Aceitou'}</h5>
                      <p className="text-muted small mb-3 fw-medium">
                        <FontAwesomeIcon icon={faPhone} className="me-1" style={{ color: '#7F00FF' }} /> {assignedDriver.phoneNumber || 'Contacto a caminho'}
                      </p>
                      <div className="badge px-3 py-2 rounded-pill fw-bold fs-6 mb-3" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                        Status: {activeRequest.status || 'Pedido aceite'}
                      </div>
                      <p className="small text-muted mb-0">
                        O prestador aceitou a viagem e está a dirigir-se a <strong>{activeRequest.origin}</strong>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="position-relative d-inline-block mb-3">
                        <div className="spinner-grow" style={{ width: '4rem', height: '4rem', color: '#7F00FF' }} role="status">
                          <span className="visually-hidden">Procurando...</span>
                        </div>
                      </div>
                      <h6 className="fw-bold text-dark mb-2">Notificação enviada aos motoristas (`nhiqueladriver`)</h6>
                      <p className="small text-muted mb-3" style={{ fontSize: '13px' }}>
                        A aguardar resposta de aceitação para o transporte de <strong>{activeRequest.origin}</strong> para <strong>{activeRequest.destination}</strong>.
                      </p>
                      <button
                        className="btn btn-outline-danger btn-sm rounded-pill fw-bold px-4 py-2"
                        onClick={handleCancelRequest}
                        style={{ fontSize: '12px' }}
                      >
                        Cancelar Solicitação
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PAINEL DE PRESTADORES DE SERVIÇO ATIVOS */}
            <div
              className="bg-white rounded-4 p-4 shadow-sm"
              style={{ border: '1px solid rgba(226, 232, 240, 0.9)' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h6 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                  <FontAwesomeIcon icon={faUserCheck} style={{ color: '#10B981' }} />
                  Prestadores de Serviço Disponíveis
                </h6>
                <span className="badge rounded-pill fw-bold" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                  {serviceProviders.length} Online
                </span>
              </div>

              {serviceProviders.length === 0 ? (
                <div className="text-muted small text-center py-4">
                  <FontAwesomeIcon icon={faBoxes} size="2x" className="mb-2 text-slate-300 d-block mx-auto" />
                  Nenhum prestador exclusivo registado no momento. As solicitações são despachadas automaticamente para a rede geral de motoristas parceiros.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2.5">
                  {serviceProviders.slice(0, 5).map((provider) => (
                    <div
                      key={provider._id}
                      className="p-3 rounded-3 d-flex justify-content-between align-items-center"
                      style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                    >
                      <div>
                        <h6 className="fw-bold m-0 text-dark" style={{ fontSize: '13.5px' }}>
                          {provider.name || provider.userId?.name || 'Prestador de Serviço'}
                        </h6>
                        <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>
                          {provider.categoryId?.nome || provider.subcategoryId?.name || 'Carga & Logística'}
                        </small>
                      </div>
                      <span
                        className="badge fw-bold px-2.5 py-1 rounded-pill"
                        style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '10.5px' }}
                      >
                        ● Disponível
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
