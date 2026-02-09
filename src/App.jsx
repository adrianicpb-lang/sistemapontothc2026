import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { 
  MapPin, User, FileText, CheckCircle, XCircle, Clock, LogOut, Shield, 
  AlertTriangle, Loader2, Users, Plus, Trash2, Edit, X, Download, 
  Archive, ChevronRight, Camera, LayoutDashboard, FileBarChart, Bell
} from 'lucide-react';

// =================================================================================
//  CONFIGURAÇÃO DO FIREBASE
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyArgWJbEegj_yoPRAjyJWnPwG5kfRb1ioA",
  authDomain: "sistema-ponto-rh.firebaseapp.com",
  projectId: "sistema-ponto-rh",
  storageBucket: "sistemapontorh.firebasestorage.app",
  messagingSenderId: "638828539578",
  appId: "1:638828539578:web:d1aa3e58e66b8d2236dc83"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Constantes
const COLLECTION_REGISTROS = "registros_ponto";
const COLLECTION_FUNCIONARIOS = "funcionarios";

// =================================================================================
//  UTILITÁRIOS E HOOKS
// =================================================================================

// Contexto de Notificação (Toast)
const NotificationContext = React.createContext();

const useNotification = () => React.useContext(NotificationContext);

const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const show = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <NotificationContext.Provider value={{ show }}>
      {children}
      {notification && (
        <div className={`fixed top-4 right-4 z-[9999] px-6 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-slide-in ${
          notification.type === 'error' 
            ? 'bg-white border-red-100 text-red-600' 
            : 'bg-white border-emerald-100 text-emerald-600'
        }`}>
          {notification.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

// Funções de Tempo
const formatTime = (dateObj) =>
  dateObj ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---';

const decimalToTime = (decimal) => {
  if (decimal === 0 || isNaN(decimal)) return '00:00';
  const sign = decimal < 0 ? "-" : "";
  const absDecimal = Math.abs(decimal);
  const hours = Math.floor(absDecimal);
  const minutes = Math.round((absDecimal - hours) * 60);
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const timeToDecimal = (timeStr) => {
  if(!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m/60);
};

// =================================================================================
//  COMPONENTES DE UI REUTILIZÁVEIS
// =================================================================================

const Button = ({ children, variant = 'primary', className = '', loading, ...props }) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading} {...props}>
      {loading && <Loader2 className="animate-spin w-4 h-4" />}
      {children}
    </button>
  );
};

// COMPONENTE INPUT (Corrigido para aceitar 'select' sem erros de children)
const Input = ({ label, className = '', as = 'input', children, ...props }) => {
  const Component = as;
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>}
      <Component 
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
        {...props}
      >
        {children}
      </Component>
    </div>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

// =================================================================================
//  MÓDULOS DO APLICATIVO
// =================================================================================

// --- TELA DE LOGIN GESTOR ---
const ManagerLogin = ({ onLogin, onBack }) => {
  const [pass, setPass] = useState('');
  const notify = useNotification();

  const handleLogin = (e) => {
    e.preventDefault();
    // ✅ SENHA ATUALIZADA
    if (pass === 'admin2309') onLogin();
    else notify.show('Senha incorreta', 'error');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Acesso Administrativo</h2>
          <p className="text-slate-500 mt-2">Gestão de Ponto e RH</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <Input 
            type="password" 
            placeholder="Senha de Acesso" 
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoFocus
          />
          <div className="space-y-3">
            <Button type="submit" className="w-full py-3">Entrar no Painel</Button>
            <Button type="button" variant="ghost" onClick={onBack} className="w-full">
              Voltar ao App do Funcionário
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// --- APP DO FUNCIONÁRIO ---
const EmployeeApp = ({ onGoToManager }) => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [view, setView] = useState('home'); // home, form-ponto, form-ausencia, camera, processing, success
  const [formData, setFormData] = useState({ nome: '', tipo: '', justificativa: '', fotoBase64: null });
  const [stream, setStream] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const notify = useNotification();

  // Relógio
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carregar Funcionários
  useEffect(() => {
    return onSnapshot(query(collection(db, COLLECTION_FUNCIONARIOS), orderBy('nome')), s => {
      setFuncionarios(s.docs.map(d => d.data().nome));
    });
  }, []);

  // Iniciar Câmera
  const startCamera = async () => {
    if (!formData.nome) return notify.show('Selecione seu nome primeiro', 'error');
    if (view === 'form-ponto' && !formData.tipo) return notify.show('Selecione o tipo de registro', 'error');
    if (view === 'form-ausencia' && !formData.justificativa) return notify.show('Digite uma justificativa', 'error');

    setView('camera');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: view === 'form-ponto' ? 'user' : 'environment' } 
      });
      setStream(s);
      if(videoRef.current) videoRef.current.srcObject = s;
    } catch(e) {
      notify.show("Erro ao acessar câmera. Verifique permissões.", 'error');
      setView('home');
    }
  };

  // Capturar Foto e Enviar
  const captureAndSend = async () => {
    if (!videoRef.current) return;
    
    // Captura
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const photo = canvasRef.current.toDataURL('image/jpeg', 0.6);
    
    // Parar stream
    if (stream) stream.getTracks().forEach(t => t.stop());
    
    setView('processing');

    // Geo
    let location = { lat: 'N/D', long: 'N/D' };
    try {
      const pos = await new Promise((resolve, reject) => 
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      location = { lat: pos.coords.latitude, long: pos.coords.longitude };
    } catch (e) {
      console.log("Geo falhou, usando N/D");
    }

    // Salvar no Firebase
    const action = formData.justificativa ? 'ausencia' : 'ponto';
    await addDoc(collection(db, COLLECTION_REGISTROS), {
      ...formData,
      fotoBase64: photo,
      latitude: location.lat,
      longitude: location.long,
      status: 'Pendente',
      timestamp: serverTimestamp(),
      action
    });

    setView('success');
    setTimeout(() => {
      setView('home');
      setFormData({ nome: '', tipo: '', justificativa: '', fotoBase64: null });
    }, 2000);
  };

  // Renderização de Telas
  if (view === 'camera') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-8">
          <button 
            onClick={() => {
              if(stream) stream.getTracks().forEach(t => t.stop());
              setView('home');
            }}
            className="text-white font-medium px-4 py-2 rounded-full bg-white/10 backdrop-blur-md"
          >
            Cancelar
          </button>
          <button 
            onClick={captureAndSend}
            className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 shadow-lg active:scale-95 transition-transform flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-400" />
          </button>
        </div>
      </div>
    );
  }

  if (view === 'processing' || view === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center animate-fade-in">
        <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6">
          {view === 'processing' ? (
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          ) : (
            <CheckCircle className="w-12 h-12 text-emerald-500 animate-bounce-short" />
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          {view === 'processing' ? 'Processando Registro...' : 'Tudo Certo!'}
        </h2>
        <p className="text-slate-500 mt-2 max-w-xs">
          {view === 'processing' ? 'Estamos salvando sua foto e localização.' : 'Seu ponto foi registrado com sucesso.'}
        </p>
      </div>
    );
  }

  // Formulários
  if (view === 'form-ponto' || view === 'form-ausencia') {
    const isPonto = view === 'form-ponto';
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 animate-fade-in">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setView('home')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <ChevronRight className="rotate-180" size={20} /> Voltar
            </button>
            <span className="font-bold text-slate-700">{isPonto ? 'Registro de Ponto' : 'Justificar Ausência'}</span>
          </div>

          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Quem é você?</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
              >
                <option value="">Selecione seu nome...</option>
                {funcionarios.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {isPonto ? (
              <div className="grid grid-cols-1 gap-3">
                {['Entrada', 'Saída Almoço', 'Entrada Almoço', 'Saída'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFormData({...formData, tipo: type})}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      formData.tipo === type 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' 
                        : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="font-medium">{type}</span>
                    {formData.tipo === type && <CheckCircle size={20} className="text-indigo-600" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Motivo da ausência</label>
                <textarea
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg h-32 resize-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descreva o motivo..."
                  value={formData.justificativa}
                  onChange={e => setFormData({...formData, justificativa: e.target.value})}
                />
              </div>
            )}

            <Button onClick={startCamera} className="w-full py-4 text-lg shadow-indigo-300 shadow-lg">
              <Camera size={20} />
              {isPonto ? 'Confirmar Ponto' : 'Enviar Justificativa'}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Home Screen
  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-600 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500 rounded-full blur-[80px]" />
      </div>

      <header className="relative z-10 p-6 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="bg-indigo-500 p-1.5 rounded-lg"><Clock size={20} className="text-white" /></div>
          RH Ponto
        </div>
        <button onClick={onGoToManager} className="text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">
          Área Gestor
        </button>
      </header>

      <main className="relative z-10 px-6 pt-8 pb-12 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] max-w-md mx-auto gap-8">
        
        {/* Relógio Principal */}
        <div className="text-center space-y-2">
          <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-indigo-200 text-sm font-medium mb-4 backdrop-blur-sm border border-white/5">
            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="text-6xl font-black tracking-tighter tabular-nums drop-shadow-2xl">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </h1>
          <p className="text-slate-400 text-sm">Horário de Brasília</p>
        </div>

        {/* Botões de Ação */}
        <div className="w-full space-y-4">
          <button 
            onClick={() => setView('form-ponto')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white p-6 rounded-2xl shadow-xl shadow-indigo-900/50 transition-all transform hover:-translate-y-1 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <MapPin size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">Registrar Ponto</h3>
                <p className="text-indigo-200 text-xs">Entrada, Saída e Intervalos</p>
              </div>
            </div>
            <ChevronRight className="text-indigo-300" />
          </button>

          <button 
            onClick={() => setView('form-ausencia')}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white p-6 rounded-2xl shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 text-emerald-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">Justificar Ausência</h3>
                <p className="text-slate-400 text-xs">Atestados e Declarações</p>
              </div>
            </div>
            <ChevronRight className="text-slate-500" />
          </button>
        </div>
      </main>
    </div>
  );
};

// --- GESTÃO DE FUNCIONÁRIOS (SUB-COMPONENTE) ---
const ManagerEmployees = () => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [editing, setEditing] = useState(null); // null ou obj funcionario
  const [newFunc, setNewFunc] = useState({ 
    nome: '', escala: '5x2', 
    entrada: '08:00', saidaAlmoco: '12:00', voltaAlmoco: '13:00', saida: '18:00',
    entradaSexta: '08:00', saidaAlmocoSexta: '12:00', voltaAlmocoSexta: '13:00', saidaSexta: '17:00'
  });
  const notify = useNotification();

  useEffect(() => {
    return onSnapshot(query(collection(db, COLLECTION_FUNCIONARIOS), orderBy('nome')), s => 
      setFuncionarios(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const handleSave = async (isEdit = false) => {
    const target = isEdit ? editing : newFunc;
    if (!target.nome) return notify.show('Nome obrigatório', 'error');

    try {
      if (isEdit) {
        await updateDoc(doc(db, COLLECTION_FUNCIONARIOS, target.id), target);
        setEditing(null);
        notify.show('Funcionário atualizado');
      } else {
        await addDoc(collection(db, COLLECTION_FUNCIONARIOS), target);
        setNewFunc({...newFunc, nome: ''}); // Reset nome apenas
        notify.show('Funcionário cadastrado');
      }
    } catch(e) {
      notify.show('Erro ao salvar', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remover este funcionário?")) {
      await deleteDoc(doc(db, COLLECTION_FUNCIONARIOS, id));
      notify.show('Funcionário removido');
    }
  };

  const renderForm = (data, setData, isEdit) => (
    <div className="grid gap-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Nome Completo" value={data.nome} onChange={e => setData({...data, nome: e.target.value})} className="md:col-span-2" />
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Escala</label>
          <select 
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            value={data.escala} onChange={e => setData({...data, escala: e.target.value})}
          >
            <option value="5x2">5x2 (Seg-Sex)</option>
            <option value="6x1">6x1 (Seg-Sáb)</option>
            <option value="12x36">12x36 (Plantão)</option>
          </select>
        </div>
      </div>
      
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
        <p className="text-xs font-bold text-indigo-600 uppercase mb-3">Horários Padrão</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input type="time" label="Entrada" value={data.entrada} onChange={e => setData({...data, entrada: e.target.value})} />
          <Input type="time" label="Saída Alm" value={data.saidaAlmoco} onChange={e => setData({...data, saidaAlmoco: e.target.value})} />
          <Input type="time" label="Volta Alm" value={data.voltaAlmoco} onChange={e => setData({...data, voltaAlmoco: e.target.value})} />
          <Input type="time" label="Saída" value={data.saida} onChange={e => setData({...data, saida: e.target.value})} />
        </div>
      </div>

      {(data.escala === '5x2' || data.escala === '6x1') && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <p className="text-xs font-bold text-emerald-600 uppercase mb-3">Horários Reduzidos (Sexta/Sábado)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input type="time" label="Entrada" value={data.entradaSexta} onChange={e => setData({...data, entradaSexta: e.target.value})} />
            <Input type="time" label="Saída Alm" value={data.saidaAlmocoSexta} onChange={e => setData({...data, saidaAlmocoSexta: e.target.value})} />
            <Input type="time" label="Volta Alm" value={data.voltaAlmocoSexta} onChange={e => setData({...data, voltaAlmocoSexta: e.target.value})} />
            <Input type="time" label="Saída" value={data.saidaSexta} onChange={e => setData({...data, saidaSexta: e.target.value})} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
        {isEdit && <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>}
        <Button onClick={() => handleSave(isEdit)}>{isEdit ? 'Salvar Alterações' : 'Cadastrar'}</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="text-indigo-600" size={20} /> Novo Colaborador
        </h3>
        {renderForm(newFunc, setNewFunc, false)}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {funcionarios.map(f => (
          <Card key={f.id} className="p-4 relative group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-slate-800">{f.nome}</h4>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{f.escala}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(f)} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded"><Edit size={16} /></button>
                <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100">
              {f.entrada} - {f.saida}
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Editar Colaborador</h3>
              <button onClick={() => setEditing(null)}><X className="text-slate-400 hover:text-slate-700" /></button>
            </div>
            {renderForm(editing, setEditing, true)}
          </Card>
        </div>
      )}
    </div>
  );
};

// --- GESTÃO DE RELATÓRIOS (ESPELHO) ---
const ManagerReports = ({ registros, funcionarios }) => {
  const [selectedFunc, setSelectedFunc] = useState("");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState([]);
  const notify = useNotification();

  // Inicializar seleção
  useEffect(() => {
    if (funcionarios.length > 0 && !selectedFunc) setSelectedFunc(funcionarios[0].nome);
  }, [funcionarios]);

  // Processar Dados do Relatório
  useEffect(() => {
    if (!selectedFunc) return;
    
    const funcData = funcionarios.find(f => f.nome === selectedFunc);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const processed = [];

    // Helper: calcular horas entre dois pontos
    const diff = (start, end) => {
      if (!start || !end) return 0;
      return (end.toDate() - start.toDate()) / 3600000;
    };

    let saldoTotal = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toLocaleDateString('pt-BR');
      const dayOfWeek = date.getDay(); // 0 dom, 6 sab
      
      const dayRegs = registros.filter(r => 
        r.nome === selectedFunc && 
        r.timestamp?.toDate()?.toLocaleDateString('pt-BR') === dateStr
      );

      const entrada = dayRegs.find(r => r.tipo === 'Entrada');
      const saidaAlm = dayRegs.find(r => r.tipo === 'Saída Almoço');
      const voltaAlm = dayRegs.find(r => r.tipo === 'Entrada Almoço');
      const saida = dayRegs.find(r => r.tipo === 'Saída');
      const abono = dayRegs.find(r => r.action === 'ausencia' && r.status === 'Aprovado');

      // Cálculo Trabalho
      let worked = 0;
      if (entrada && saida) {
        if (saidaAlm && voltaAlm) {
          worked = diff(entrada.timestamp, saidaAlm.timestamp) + diff(voltaAlm.timestamp, saida.timestamp);
        } else {
          worked = diff(entrada.timestamp, saida.timestamp);
        }
      }

      // Horas Abonadas
      const abonadas = abono ? timeToDecimal(abono.horasAbonadas || '00:00') : 0;
      
      // Cálculo Expectativa (Simplificado)
      let expected = 8;
      const isWeekend = dayOfWeek === 0 || (dayOfWeek === 6 && funcData?.escala === '5x2');
      if (isWeekend) expected = 0;
      if (dayOfWeek === 5 && funcData?.escala === '5x2') expected = 8; // Sexta normal ou reduzida (simplificado para 8)
      
      // 12x36 lógica simples: se trabalhou, esperava-se 12, se não, 0 (aproximação)
      if (funcData?.escala === '12x36') {
        expected = (worked > 0 || abonadas > 0) ? 12 : 0;
      }

      const saldo = (worked + abonadas) - expected;
      if (expected > 0 || worked > 0) saldoTotal += saldo;

      processed.push({
        date,
        dayOfWeek,
        isWeekend,
        entrada, saidaAlm, voltaAlm, saida,
        worked, abonadas, saldo, abono
      });
    }
    setReportData(processed);
  }, [selectedFunc, month, year, registros, funcionarios]);

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: landscape; margin: 5mm; }
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Controles */}
      <Card className="p-4 flex flex-wrap gap-4 items-end no-print">
        <div className="flex-1 min-w-[200px]">
          <Input label="Colaborador" as="select" value={selectedFunc} onChange={e => setSelectedFunc(e.target.value)}>
            {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
          </Input>
        </div>
        <div className="w-32">
          <Input label="Mês" as="select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {Array.from({length: 12}, (_, i) => (
              <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</option>
            ))}
          </Input>
        </div>
        <div className="w-24">
          <Input label="Ano" as="select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </Input>
        </div>
        <Button onClick={() => window.print()}>
          <Download size={18} /> Imprimir PDF
        </Button>
      </Card>

      {/* Área de Impressão */}
      <div id="printable-area" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold uppercase text-slate-800">Espelho de Ponto</h2>
            <p className="text-sm text-slate-500">{selectedFunc} • {new Date(year, month).toLocaleString('pt-BR', {month: 'long', year: 'numeric'})}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase">Saldo do Mês</p>
            <p className={`text-2xl font-bold ${
              reportData.reduce((acc, curr) => acc + curr.saldo, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {decimalToTime(reportData.reduce((acc, curr) => acc + curr.saldo, 0))}h
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <th className="p-2 font-bold">Dia</th>
                <th className="p-2 text-center">Entrada</th>
                <th className="p-2 text-center">Almoço Sai</th>
                <th className="p-2 text-center">Almoço Vol</th>
                <th className="p-2 text-center">Saída</th>
                <th className="p-2 text-center">Trabalhado</th>
                <th className="p-2 text-center">Abono</th>
                <th className="p-2 text-center">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((row, i) => (
                <tr key={i} className={`
                  ${row.isWeekend ? 'bg-slate-50' : ''} 
                  ${row.saldo < 0 && !row.isWeekend ? 'text-rose-600' : 'text-slate-700'}
                  hover:bg-slate-50 transition-colors
                `}>
                  <td className="p-2 font-medium border-r border-slate-100">
                    {row.date.getDate()} <span className="text-xs text-slate-400 uppercase ml-1">{row.date.toLocaleDateString('pt-BR', {weekday: 'short'})}</span>
                  </td>
                  <td className="p-2 text-center">{formatTime(row.entrada?.timestamp?.toDate())}</td>
                  <td className="p-2 text-center">{formatTime(row.saidaAlm?.timestamp?.toDate())}</td>
                  <td className="p-2 text-center">{formatTime(row.voltaAlm?.timestamp?.toDate())}</td>
                  <td className="p-2 text-center border-r border-slate-100">{formatTime(row.saida?.timestamp?.toDate())}</td>
                  <td className="p-2 text-center font-mono">{decimalToTime(row.worked)}</td>
                  <td className="p-2 text-center text-blue-600">{row.abonadas > 0 ? decimalToTime(row.abonadas) : '-'}</td>
                  <td className={`p-2 text-center font-bold font-mono ${row.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {decimalToTime(row.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- GESTÃO DE AUSÊNCIAS (JUSTIFICATIVAS) ---
const ManagerAbsences = ({ registros }) => {
  const notify = useNotification();
  const pendentes = registros.filter(r => r.action === 'ausencia' && r.status === 'Pendente');

  const handleUpdate = async (id, status, horas = null) => {
    try {
      await updateDoc(doc(db, COLLECTION_REGISTROS, id), { 
        status,
        horasAbonadas: horas 
      });
      notify.show(`Justificativa ${status.toLowerCase()}`);
    } catch(e) {
      notify.show('Erro ao atualizar', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
      {pendentes.length === 0 && (
        <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
          Nenhuma justificativa pendente.
        </div>
      )}
      
      {pendentes.map(reg => (
        <Card key={reg.id} className="p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><User size={16} /></div>
              <div>
                <h4 className="font-bold text-slate-800">{reg.nome}</h4>
                <p className="text-xs text-slate-500">{reg.timestamp?.toDate().toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Pendente</span>
          </div>

          <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 italic border border-slate-100">
            "{reg.justificativa}"
          </div>

          {reg.fotoBase64 && (
            <div className="relative h-40 bg-slate-200 rounded-lg overflow-hidden group cursor-pointer border border-slate-200">
              <img src={reg.fotoBase64} className="w-full h-full object-cover" alt="Comprovante" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-medium transition-opacity"
                   onClick={() => {
                     const w = window.open("");
                     w.document.write(`<img src="${reg.fotoBase64}" style="max-width:100%"/>`);
                   }}>
                Ver Comprovante Original
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-auto">
            <Button variant="danger" onClick={() => handleUpdate(reg.id, 'Rejeitado')}>Rejeitar</Button>
            <Button variant="primary" onClick={() => {
              const horas = prompt("Quantas horas deseja abonar? (HH:MM)", "08:00");
              if (horas) handleUpdate(reg.id, 'Aprovado', horas);
            }}>Abonar</Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

// --- PAINEL GESTOR (CONTAINER) ---
const ManagerDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [registros, setRegistros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub1 = onSnapshot(query(collection(db, COLLECTION_REGISTROS), orderBy('timestamp', 'desc')), s => 
      setRegistros(s.docs.map(d => ({id: d.id, ...d.data()})))
    );
    const unsub2 = onSnapshot(query(collection(db, COLLECTION_FUNCIONARIOS), orderBy('nome')), s => 
      setFuncionarios(s.docs.map(d => ({id: d.id, ...d.data()})))
    );
    return () => { unsub1(); unsub2(); };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'employees', label: 'Colaboradores', icon: Users },
    { id: 'absences', label: 'Justificativas', icon: AlertTriangle, count: registros.filter(r => r.action === 'ausencia' && r.status === 'Pendente').length },
    { id: 'reports', label: 'Relatórios', icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
            <Shield size={24} /> RH System
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} /> {item.label}
              </div>
              {item.count > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={onLogout} className="flex items-center gap-2 text-slate-500 hover:text-rose-600 text-sm font-medium w-full px-4 py-2">
            <LogOut size={18} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Header Mobile */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-40">
        <h1 className="font-bold text-indigo-700 flex items-center gap-2"><Shield size={20} /> RH</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-100 rounded">
          {isMobileMenuOpen ? <X size={20} /> : <LayoutDashboard size={20} />}
        </button>
      </div>

      {/* Nav Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-30 p-4 space-y-2 animate-fade-in">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium ${
                activeTab === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
              }`}
            >
              <item.icon size={20} /> {item.label}
              {item.count > 0 && <span className="ml-auto bg-rose-500 text-white px-2 rounded-full text-xs">{item.count}</span>}
            </button>
          ))}
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 text-rose-600 font-medium">
            <LogOut size={20} /> Sair
          </button>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-center no-print">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-slate-500 text-sm">Bem-vindo, Gestor.</p>
          </div>
          <div className="hidden md:block text-right text-xs text-slate-400">
            {new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 flex items-center gap-4 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-none">
                <div className="bg-white/20 p-3 rounded-xl"><Clock size={24} /></div>
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Registros Hoje</p>
                  <p className="text-3xl font-bold">
                    {registros.filter(r => r.timestamp?.toDate()?.toDateString() === new Date().toDateString()).length}
                  </p>
                </div>
              </Card>
              <Card className="p-6 flex items-center gap-4">
                <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl"><Users size={24} /></div>
                <div>
                  <p className="text-slate-500 text-sm font-medium">Colaboradores</p>
                  <p className="text-3xl font-bold text-slate-800">{funcionarios.length}</p>
                </div>
              </Card>
              <Card className="p-6 flex items-center gap-4">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-xl"><AlertTriangle size={24} /></div>
                <div>
                  <p className="text-slate-500 text-sm font-medium">Pendências</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {registros.filter(r => r.status === 'Pendente').length}
                  </p>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-bold text-slate-800 mb-4">Atividade Recente</h3>
              <div className="space-y-4">
                {registros.slice(0, 8).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                        {r.fotoBase64 ? <img src={r.fotoBase64} className="w-full h-full object-cover" /> : <User className="m-2 text-slate-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{r.nome}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {r.action === 'ponto' ? (
                            <><MapPin size={10} /> {r.tipo}</>
                          ) : (
                            <><FileText size={10} /> Ausência</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-slate-600">{r.timestamp?.toDate()?.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        r.status === 'Pendente' ? 'bg-amber-100 text-amber-700' : 
                        r.status === 'Rejeitado' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'employees' && <ManagerEmployees />}
        {activeTab === 'absences' && <ManagerAbsences registros={registros} />}
        {activeTab === 'reports' && <ManagerReports registros={registros} funcionarios={funcionarios} />}
      </main>
    </div>
  );
};

// --- APP ROOT ---
const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('employee'); // employee, manager-login, manager-dash
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Autenticação anônima simples para persistência básica
    signInAnonymously(auth).catch(console.error);
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <NotificationProvider>
      {view === 'employee' && <EmployeeApp onGoToManager={() => setView('manager-login')} />}
      {view === 'manager-login' && <ManagerLogin onLogin={() => setView('manager-dash')} onBack={() => setView('employee')} />}
      {view === 'manager-dash' && <ManagerDashboard onLogout={() => setView('employee')} />}
    </NotificationProvider>
  );
};

export default App;
