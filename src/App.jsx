import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import logo from './assets/logo.svg';
import './App.css';

export default function App() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Real GET request: load the user from SQLite using the id stored in Cookies.
  useEffect(() => {
    const userId = Cookies.get('auth_token');

    if (!userId) return;

    fetch(`/api/user/${userId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load user');
        return data;
      })
      .then((data) => {
        setCurrentUser(data.user);
      })
      .catch((error) => {
        console.error('GET error:', error);
        Cookies.remove('auth_token');
        setCurrentUser(null);
      });
  }, []);

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Имя пользователя обязательно для заполнения';
    }

    if (!formData.email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      newErrors.email = 'Введите корректный адрес электронной почты';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен содержать не менее 6 символов';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Real POST request: send registration data to Express, which saves it in SQLite.
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setStatusMessage('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      Cookies.set('auth_token', data.token, { expires: 7 });
      setCurrentUser(data.user);
      setFormData({ username: '', email: '', password: '' });
      setStatusMessage('Регистрация успешна! Данные сохранены в SQLite, а ID пользователя записан в Cookies.');
    } catch (error) {
      setStatusMessage(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove('auth_token');
    setCurrentUser(null);
    setStatusMessage('Cookie сессии удалена.');
  };

  return (
    <div className="container">
      <header className="header">
        <img src={logo} className="logo" alt="Логотип приложения" />
        <h1>Регистрация профиля</h1>
      </header>

      {currentUser ? (
        <div className="profile-card">
          <h2>Личный кабинет (GET из SQLite)</h2>
          <p><strong>ID:</strong> {currentUser.id}</p>
          <p><strong>Пользователь:</strong> {currentUser.username}</p>
          <p><strong>Email:</strong> {currentUser.email}</p>
          <button onClick={handleLogout} className="btn-logout">Выйти и удалить Cookie</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <h2>Форма регистрации</h2>

          <div className="field">
            <label>Имя пользователя:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Введите имя"
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </div>

          <div className="field">
            <label>Электронная почта:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          <div className="field">
            <label>Пароль:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Минимум 6 символов"
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Отправка...' : 'Зарегистрироваться (POST)'}
          </button>
        </form>
      )}

      {statusMessage && <p className="status-info">{statusMessage}</p>}
    </div>
  );
}
