// src/utils/customerName.js

export const getCustomerName = (message, user, fallback = 'Customer') => {
  // Priority order for name resolution
  if (user?.full_name) return user.full_name;
  if (message?.sender_name && message.sender_name !== 'Guest' && message.sender_name !== 'Customer') {
    return message.sender_name;
  }
  if (localStorage.getItem('customer_name')) {
    return localStorage.getItem('customer_name');
  }
  return fallback;
};

export const getCustomerEmail = (message, user, fallback = '') => {
  if (user?.email) return user.email;
  if (message?.sender_email) return message.sender_email;
  if (localStorage.getItem('customer_email')) {
    return localStorage.getItem('customer_email');
  }
  return fallback;
};

export const saveCustomerInfo = (name, email) => {
  if (name && name !== 'Guest' && name !== 'Customer') {
    localStorage.setItem('customer_name', name);
  }
  if (email) {
    localStorage.setItem('customer_email', email);
  }
};