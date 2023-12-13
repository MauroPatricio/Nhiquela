import React, { useContext, useState } from 'react';

import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { Row, Col } from 'react-bootstrap';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Store } from '../Store';
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js';



export default function InvoiceGenerator() {
  const [items, setItems] = useState([
    { description: 'Item 1', quantity: 2, price: 10 },
    { description: 'Item 2', quantity: 1, price: 20 },
    // Add more items as needed
  ]);

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + item.quantity * item.price, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
    // You can add additional logic for taxes, discounts, etc., if needed
  };

  const downloadInvoice = () => {
    const invoiceTable = document.getElementById('invoice-table');
    const pdfOptions = {
      margin: 10,
      filename: 'nhiquelainvoice.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().from(invoiceTable).set(pdfOptions).save();
  };

  return (
    <div>
      <h1>Invoice</h1>
      <table id="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="3">Subtotal</td>
            <td>${calculateSubtotal().toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan="3">Total</td>
            <td>${calculateTotal().toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <button onClick={downloadInvoice}>Download Invoice</button>
    </div>
  )

}
