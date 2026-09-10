import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://127.0.0.1:8000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  // ---- Auth form state ----
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // ---- Customer data + form state ----
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [itemType, setItemType] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [cycleMonths, setCycleMonths] = useState(6);

  // ---- Due soon filter state ----
  const [dueSoonOnly, setDueSoonOnly] = useState(false);
  const [dueSoonDays, setDueSoonDays] = useState(30);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderCustomer, setReminderCustomer] = useState(null);

  const loadCustomers = (authToken) => {
    fetch(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data) => setCustomers(data))
      .catch((err) => console.error('Failed to fetch customers:', err));
  };

  const loadDueSoon = (authToken, days) => {
    fetch(`${API_URL}/customers/due-soon/${days}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data) => setCustomers(data))
      .catch((err) => console.error('Failed to fetch due-soon customers:', err));
  };

  useEffect(() => {
    if (token) {
      loadCustomers(token);
    }
  }, [token]);

  const handleSignup = (e) => {
    e.preventDefault();
    setAuthError('');

    fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_name: businessName, email, password }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Signup failed - email may already be registered');
        return res.json();
      })
      .then(() => {
        setAuthMode('login');
        setAuthError('Account created! Please log in.');
      })
      .catch((err) => setAuthError(err.message));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');

    const formBody = new URLSearchParams();
    formBody.append('username', email);
    formBody.append('password', password);

    fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid email or password');
        return res.json();
      })
      .then((data) => {
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
      })
      .catch((err) => setAuthError(err.message));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCustomers([]);
    setDueSoonOnly(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newCustomer = {
      name: name,
      phone: phone,
      renewal_item: {
        item_type: itemType,
        reference_number: referenceNumber,
        start_date: startDate,
        cycle_months: parseInt(cycleMonths),
      },
    };

    fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newCustomer),
    })
      .then((res) => res.json())
      .then(() => {
        if (dueSoonOnly) {
          loadDueSoon(token, dueSoonDays);
        } else {
          loadCustomers(token);
        }
        setName('');
        setPhone('');
        setItemType('');
        setReferenceNumber('');
        setStartDate('');
        setCycleMonths(6);
      })
      .catch((err) => console.error('Failed to add customer:', err));
  };

  const handleDelete = (customerId) => {
    fetch(`${API_URL}/customers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        if (dueSoonOnly) {
          loadDueSoon(token, dueSoonDays);
        } else {
          loadCustomers(token);
        }
      })
      .catch((err) => console.error('Failed to delete customer:', err));
  };

  const handleToggleDueSoon = () => {
    const next = !dueSoonOnly;
    setDueSoonOnly(next);
    if (next) {
      loadDueSoon(token, dueSoonDays);
    } else {
      loadCustomers(token);
    }
  };

  // ---- WhatsApp reminder ----
  const buildDefaultMessage = (customer, item) => {
    const refPart = item.reference_number ? ` (Ref: ${item.reference_number})` : '';
    const englishMsg = `Hi ${customer.name}, this is a reminder that your ${item.item_type}${refPart} is expiring on ${item.expiry_date}. Please visit our shop to renew it.`;
    const hindiMsg = `${customer.name} जी, यह एक रिमाइंडर है कि आपका ${item.item_type}${refPart} ${item.expiry_date} को समाप्त हो रहा है। कृपया इसे वापस से रेनू कराने के लिए हमारी दुकान पर आएं।`;
    return `${englishMsg}\n\n${hindiMsg}`;
  };

  const handleOpenReminderModal = (customer) => {
    const item = customer.renewal_items[0];
    if (!item) return;

    const defaultMessage = buildDefaultMessage(customer, item);
    setReminderCustomer(customer);
    setReminderMessage(defaultMessage);
    setReminderModalOpen(true);
  };

  const handleConfirmSendReminder = () => {
    let phoneForWhatsapp = reminderCustomer.phone.replace(/\D/g, '');
    if (phoneForWhatsapp.length === 10) {
      phoneForWhatsapp = '91' + phoneForWhatsapp;
    }

    const waLink = `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(reminderMessage)}`;
    window.open(waLink, '_blank');

    setReminderModalOpen(false);
    setReminderCustomer(null);
  };

  const handleCancelReminder = () => {
    setReminderModalOpen(false);
    setReminderCustomer(null);
  };

  // ---- If not logged in, show auth screen ----
  if (!token) {
    return (
      <div className="auth-container">
        <h1>DueDesk</h1>
        <h2>{authMode === 'login' ? 'Log In' : 'Sign Up'}</h2>

        <form onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
          {authMode === 'signup' && (
            <input
              type="text"
              placeholder="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">{authMode === 'login' ? 'Log In' : 'Sign Up'}</button>
        </form>

        {authError && <p className="auth-error">{authError}</p>}

        <button
          className="auth-switch"
          onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        >
          {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    );
  }

  // ---- If logged in, show the dashboard ----
  return (
    <div>
      <div className="top-bar">
        <h1>DueDesk</h1>
        <button className="btn-secondary" onClick={handleLogout}>Log Out</button>
      </div>

      <h2>Add Customer</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <input
          type="text"
          placeholder="Item Type (e.g. PUC)"
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Reference No. (e.g. PUC12345)"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        <input
          type="number"
          placeholder="Cycle (months)"
          value={cycleMonths}
          onChange={(e) => setCycleMonths(e.target.value)}
          required
        />
        <button type="submit">Add Customer</button>
      </form>

      <h2>Customers</h2>

      <div className="filter-row">
        <label>
          <input type="checkbox" checked={dueSoonOnly} onChange={handleToggleDueSoon} />
          Show only due within
        </label>
        <input
          type="number"
          value={dueSoonDays}
          onChange={(e) => {
            const days = parseInt(e.target.value) || 0;
            setDueSoonDays(days);
            if (dueSoonOnly) loadDueSoon(token, days);
          }}
        />
        days
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Item Type</th>
            <th>Reference No.</th>
            <th>Expiry Date</th>
            <th>Cycle</th>
            <th>Days Left</th>
            <th>Remind</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[...customers]
            .sort((a, b) => {
              const aExpiry = a.renewal_items[0]?.expiry_date;
              const bExpiry = b.renewal_items[0]?.expiry_date;
              if (!aExpiry) return 1;
              if (!bExpiry) return -1;
              return new Date(aExpiry) - new Date(bExpiry);
            })
            .map((customer) => {
              const nearestExpiry = customer.renewal_items[0]?.expiry_date;
              const daysUntil = nearestExpiry
                ? Math.ceil((new Date(nearestExpiry) - new Date()) / (1000 * 60 * 60 * 24))
                : null;
              const isUrgent = daysUntil !== null && daysUntil <= 7;
              const isOverdue = daysUntil !== null && daysUntil < 0;

              let daysLabel = 'N/A';
              if (daysUntil !== null) {
                daysLabel = daysUntil < 0 ? `Overdue by ${Math.abs(daysUntil)}d` : `${daysUntil}d`;
              }

              return (
                <tr
                  key={customer.id}
                  style={{
                    backgroundColor: isOverdue ? '#5c1a1a' : isUrgent ? '#5c4a1a' : 'transparent',
                  }}
                >
                  <td>{customer.name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.renewal_items.map((item) => item.item_type).join(', ')}</td>
                  <td>{customer.renewal_items.map((item) => item.reference_number || '—').join(', ')}</td>
                  <td>{customer.renewal_items.map((item) => item.expiry_date).join(', ')}</td>
                  <td>{customer.renewal_items.map((item) => `${item.cycle_months}mo`).join(', ')}</td>
                  <td>{daysLabel}</td>
                  <td>
                    <button onClick={() => handleOpenReminderModal(customer)}>Send Reminder</button>
                  </td>
                  <td>
                    <button className="btn-danger" onClick={() => handleDelete(customer.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      {reminderModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Edit reminder for {reminderCustomer?.name}</h3>
            <textarea
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              rows={10}
            />
            <div className="modal-actions">
              <button onClick={handleConfirmSendReminder}>Send via WhatsApp</button>
              <button className="btn-secondary" onClick={handleCancelReminder}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;