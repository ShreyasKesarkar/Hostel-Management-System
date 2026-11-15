/**
 * Fee Management Page Component
 *
 * Handles hostel invoicing, student dues, and simulated payment processing:
 * - Summary cards displaying Total Invoiced, Collected, and Outstanding balances
 * - Admin fee generation (individual student or bulk semester invoice generation)
 * - Payment modal supporting UPI, Net Banking, and Card payments
 * - Complete audit trail of payment transactions with reference numbers
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Plus,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  History,
  QrCode
} from 'lucide-react';

const FeesPage = () => {
  const { user, isStudent, isStaff } = useAuth();

  // Component state
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({ totalReceivable: 0, totalCollected: 0, totalPending: 0 });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Selected fee for payment or history
  const [selectedFee, setSelectedFee] = useState(null);
  const [feeDetails, setFeeDetails] = useState(null);

  // Fee Generation Form
  const [generateForm, setGenerateForm] = useState({
    student_id: '',
    semester: 'Semester 1',
    academic_year: '2024-2025',
    total_amount: 18000,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    apply_to_all: false
  });

  // Payment Form (Simulated academic payments)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'UPI',
    remarks: 'Hostel semester fee payment'
  });

  useEffect(() => {
    fetchFees();
    if (isStaff) {
      fetchStudents();
    }
  }, [statusFilter, semesterFilter]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (semesterFilter !== 'All') params.semester = semesterFilter;

      const response = await api.get('/fees', { params });
      if (response.data && response.data.success) {
        setFees(response.data.data);
        if (response.data.summary) {
          setSummary(response.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load fees:', err);
      setAlert({ type: 'error', message: 'Failed to load fee records.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      if (response.data && response.data.success) {
        setStudents(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  // Open Payment Modal
  const handleOpenPay = (fee) => {
    setSelectedFee(fee);
    setPaymentForm({
      amount: (fee.total_amount - fee.paid_amount).toString(),
      payment_method: 'UPI',
      remarks: `Payment for ${fee.semester}`
    });
    setIsPayModalOpen(true);
  };

  // View Invoice Transactions History
  const handleViewHistory = async (fee) => {
    try {
      const response = await api.get(`/fees/${fee.id}`);
      if (response.data && response.data.success) {
        setFeeDetails(response.data.data);
        setIsHistoryModalOpen(true);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to retrieve transaction history.' });
    }
  };

  // Submit Generate Fee
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/fees/generate', generateForm);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsGenerateModalOpen(false);
        fetchFees();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to generate fee record.' });
    }
  };

  // Submit Simulated Payment
  const handlePaySubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/fees/${selectedFee.id}/pay`, paymentForm);
      if (response.data && response.data.success) {
        setAlert({
          type: 'success',
          message: `Payment successful! Transaction Reference: ${response.data.transactionReference}`
        });
        setIsPayModalOpen(false);
        fetchFees();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Payment failed.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Hostel Fee Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStudent
              ? 'View semester fee statements and make simulated academic payments'
              : 'Generate fee demands, track collections, and audit payment receipts'}
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Invoices</span>
          </button>
        )}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Financial Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Invoiced"
          value={`₹${summary.totalReceivable?.toLocaleString()}`}
          subtitle="Total fees billed"
          icon={Receipt}
          color="blue"
        />

        <StatCard
          title="Total Collected"
          value={`₹${summary.totalCollected?.toLocaleString()}`}
          subtitle="Successfully paid dues"
          icon={TrendingUp}
          color="emerald"
        />

        <StatCard
          title="Pending Balance"
          value={`₹${summary.totalPending?.toLocaleString()}`}
          subtitle="Outstanding receivables"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
        >
          <option value="All">All Payment Statuses</option>
          <option value="Paid">Paid in Full</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Pending">Pending</option>
        </select>

        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
        >
          <option value="All">All Semesters</option>
          <option value="Semester 1">Semester 1</option>
          <option value="Semester 2">Semester 2</option>
          <option value="Semester 3">Semester 3</option>
          <option value="Semester 4">Semester 4</option>
          <option value="Semester 5">Semester 5</option>
          <option value="Semester 6">Semester 6</option>
          <option value="Semester 7">Semester 7</option>
          <option value="Semester 8">Semester 8</option>
        </select>
      </div>

      {/* Fee Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <div className="inline-block w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p>Loading fee records...</p>
          </div>
        ) : fees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Pending</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fees.map((fee) => {
                  const isFullyPaid = fee.status === 'Paid';
                  const pendingBal = fee.total_amount - fee.paid_amount;

                  return (
                    <tr key={fee.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">INV-{fee.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{fee.student_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {fee.enrollment_no} {fee.room_number ? `• Room ${fee.room_number}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{fee.semester}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">₹{fee.total_amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">₹{fee.paid_amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 font-bold text-amber-600">₹{pendingBal?.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={fee.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleViewHistory(fee)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="View transaction history"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {!isFullyPaid && (
                            <button
                              onClick={() => handleOpenPay(fee)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{isStudent ? 'Pay Now' : 'Record Pay'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">No fee invoices found.</div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: GENERATE FEE INVOICE (STAFF)                    */}
      {/* ======================================================== */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Hostel Fee Invoices"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
            <input
              type="checkbox"
              id="apply_to_all"
              checked={generateForm.apply_to_all}
              onChange={(e) => setGenerateForm({ ...generateForm, apply_to_all: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
            <label htmlFor="apply_to_all" className="font-semibold cursor-pointer">
              Generate for ALL registered students simultaneously
            </label>
          </div>

          {!generateForm.apply_to_all && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
              <select
                required={!generateForm.apply_to_all}
                value={generateForm.student_id}
                onChange={(e) => setGenerateForm({ ...generateForm, student_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="">-- Choose student --</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.enrollment_no})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester *</label>
              <select
                value={generateForm.semester}
                onChange={(e) => setGenerateForm({ ...generateForm, semester: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={`Semester ${s}`}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
              <input
                type="text"
                required
                value={generateForm.academic_year}
                onChange={(e) => setGenerateForm({ ...generateForm, academic_year: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={generateForm.total_amount}
                onChange={(e) => setGenerateForm({ ...generateForm, total_amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={generateForm.due_date}
                onChange={(e) => setGenerateForm({ ...generateForm, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Generate
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: SIMULATED PAYMENT DIALOG                        */}
      {/* ======================================================== */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Simulate Fee Payment"
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <span className="text-slate-500 block">Student: {selectedFee?.student_name}</span>
            <span className="text-slate-700 font-semibold block">{selectedFee?.semester}</span>
            <div className="mt-2 flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total Outstanding:</span>
              <span className="text-amber-600">
                ₹{((selectedFee?.total_amount || 0) - (selectedFee?.paid_amount || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              required
              min="1"
              max={(selectedFee?.total_amount || 0) - (selectedFee?.paid_amount || 0)}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="Net Banking">Net Banking (HDFC / SBI / ICICI)</option>
              <option value="Credit/Debit Card">Credit / Debit Card</option>
              <option value="Cash">Cash Receipt</option>
              <option value="Demand Draft">Demand Draft</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              value={paymentForm.remarks}
              onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Confirm Payment</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: INVOICE TRANSACTION HISTORY                     */}
      {/* ======================================================== */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Payment History: Invoice #${feeDetails?.id}`}
        maxWidth="max-w-2xl"
      >
        {feeDetails && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-400 block">Total Due</span>
                <span className="font-bold text-slate-800">₹{feeDetails.total_amount?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Paid</span>
                <span className="font-bold text-emerald-600">₹{feeDetails.paid_amount?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Balance Pending</span>
                <span className="font-bold text-amber-600">
                  ₹{(feeDetails.total_amount - feeDetails.paid_amount)?.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-slate-800 mb-2">Transaction History</h5>
              {feeDetails.payments && feeDetails.payments.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Transaction Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {feeDetails.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2.5 text-slate-600">{new Date(p.payment_date).toLocaleString()}</td>
                          <td className="p-2.5 font-bold text-emerald-600">₹{p.amount?.toLocaleString()}</td>
                          <td className="p-2.5 font-medium">{p.payment_method}</td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-500">{p.transaction_reference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 py-4 text-center">No payment transactions recorded yet.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FeesPage;

