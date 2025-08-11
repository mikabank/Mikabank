import React, { useState, useEffect } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { 
  CreditCard, 
  Send, 
  QrCode, 
  History, 
  Settings, 
  LogOut, 
  Eye, 
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Mail,
  Phone,
  Shield
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  
  // Form states
  const [loginForm, setLoginForm] = useState({ email_or_cpf: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', cpf: '', password: '' });
  const [transferForm, setTransferForm] = useState({ recipient_identifier: '', amount: '', description: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const apiCall = async (endpoint, method = 'GET', data = null) => {
    try {
      const config = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (data) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Erro na requisição');
      }

      return result;
    } catch (error) {
      throw error;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const data = await apiCall('/api/profile');
      setUser(data);
      setCurrentView('dashboard');
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
      setCurrentView('login');
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await apiCall('/api/transactions');
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiCall('/api/login', 'POST', loginForm);
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);
      setUser(data.user);
      setCurrentView('dashboard');
      setSuccess('Login realizado com sucesso!');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiCall('/api/register', 'POST', registerForm);
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);
      setUser(data.user);
      setCurrentView('dashboard');
      setSuccess('Conta criada com sucesso! Você recebeu R$ 10,00 de bônus!');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiCall('/api/transfer', 'POST', {
        recipient_identifier: transferForm.recipient_identifier,
        amount: parseFloat(transferForm.amount),
        description: transferForm.description || 'Transferência'
      });
      
      setSuccess(`Transferência de R$ ${transferForm.amount} realizada para ${data.recipient_name}!`);
      setTransferDialogOpen(false);
      setTransferForm({ recipient_identifier: '', amount: '', description: '' });
      
      // Refresh user data and transactions
      await fetchUserProfile();
      await fetchTransactions();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCurrentView('login');
    setSuccess('Logout realizado com sucesso!');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Login/Register View
  if (currentView === 'login' || currentView === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">MikaBank</h1>
            <p className="text-purple-200">Seu banco digital moderno</p>
          </div>

          <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white text-center">
                {currentView === 'login' ? 'Entrar na sua conta' : 'Criar conta'}
              </CardTitle>
              <CardDescription className="text-purple-200 text-center">
                {currentView === 'login' 
                  ? 'Digite suas credenciais para acessar' 
                  : 'Preencha os dados para começar'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-100 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-500/20 border border-green-500/30 text-green-100 p-3 rounded-md text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={currentView === 'login' ? handleLogin : handleRegister}>
                {currentView === 'register' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">Nome completo</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome completo"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cpf" className="text-white">CPF</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={registerForm.cpf}
                        onChange={(e) => setRegisterForm({...registerForm, cpf: e.target.value})}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                        required
                      />
                    </div>
                  </>
                )}

                {currentView === 'login' && (
                  <div className="space-y-2">
                    <Label htmlFor="email_or_cpf" className="text-white">Email ou CPF</Label>
                    <Input
                      id="email_or_cpf"
                      placeholder="seu@email.com ou CPF"
                      value={loginForm.email_or_cpf}
                      onChange={(e) => setLoginForm({...loginForm, email_or_cpf: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={currentView === 'login' ? loginForm.password : registerForm.password}
                      onChange={(e) => {
                        if (currentView === 'login') {
                          setLoginForm({...loginForm, password: e.target.value});
                        } else {
                          setRegisterForm({...registerForm, password: e.target.value});
                        }
                      }}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Carregando...' : (currentView === 'login' ? 'Entrar' : 'Criar conta')}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="text-center">
              <p className="text-purple-200 text-sm w-full">
                {currentView === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
                <button 
                  onClick={() => {
                    setCurrentView(currentView === 'login' ? 'register' : 'login');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-purple-300 hover:text-white underline"
                >
                  {currentView === 'login' ? 'Criar conta' : 'Fazer login'}
                </button>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-purple-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              MikaBank
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar>
                <AvatarFallback className="bg-purple-600 text-white">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-gray-700">{user?.name}</span>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-purple-200 text-sm">Saldo disponível</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-3xl font-bold">
                    {showBalance ? formatCurrency(user?.balance || 0) : '••••••'}
                  </span>
                  <button 
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-purple-200 hover:text-white"
                  >
                    {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <CreditCard className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Send className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800">Transferir</h3>
                  <p className="text-sm text-gray-600 mt-1">Enviar dinheiro</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transferir Dinheiro</DialogTitle>
                <DialogDescription>
                  Envie dinheiro para outro usuário MikaBank
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleTransfer}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipient">Destinatário (Email ou CPF)</Label>
                    <Input
                      id="recipient"
                      placeholder="email@exemplo.com ou CPF"
                      value={transferForm.recipient_identifier}
                      onChange={(e) => setTransferForm({...transferForm, recipient_identifier: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={user?.balance || 0}
                      placeholder="0,00"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Motivo da transferência..."
                      value={transferForm.description}
                      onChange={(e) => setTransferForm({...transferForm, description: e.target.value})}
                    />
                  </div>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Enviando...' : 'Transferir'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <QrCode className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800">Receber</h3>
                  <p className="text-sm text-gray-600 mt-1">Gerar QR Code</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Receber Dinheiro</DialogTitle>
                <DialogDescription>
                  Compartilhe seu QR Code ou link para receber dinheiro
                </DialogDescription>
              </DialogHeader>
              
              <div className="text-center space-y-4">
                <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">QR Code em desenvolvimento</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Seu código de usuário:</p>
                  <p className="font-mono text-sm">{user?.email}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <History className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">Extrato</h3>
              <p className="text-sm text-gray-600 mt-1">Ver histórico</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5 text-purple-600" />
              <span>Últimas Transações</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma transação encontrada</p>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.from_user_id === user?.id 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {transaction.from_user_id === user?.id ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.from_user_id === user?.id 
                            ? `Para ${transaction.to_user_name}` 
                            : `De ${transaction.from_user_name}`
                          }
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.from_user_id === user?.id 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {transaction.from_user_id === user?.id ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;