import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import api from '../../api/axios';
import { Flag, CheckCircle } from 'lucide-react';

export const ReportModal = ({ isOpen, userToReport, onClose }) => {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!userToReport) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post('/safety/report', {
        reportedUserId: userToReport._id,
        reason,
        details,
      });

      if (res.data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setDetails('');
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error('Report submission failed:', err);
      alert(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report User" maxWidth="max-w-md">
      {submitted ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Report Submitted
          </h3>
          <p className="text-xs text-slate-500 max-w-xs">
            Thank you for helping keep the platform safe. Our team will review this report promptly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You are reporting <strong className="text-slate-800 dark:text-slate-200">@{userToReport.username}</strong> ({userToReport.name}).
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason for report
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-transparent focus:border-emerald-500 focus:outline-none"
            >
              <option value="spam">Spam / Unsolicited messages</option>
              <option value="harassment">Harassment or bullying</option>
              <option value="inappropriate">Inappropriate or abusive behavior</option>
              <option value="other">Other issue</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Additional Details (optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what happened..."
              className="w-full bg-slate-100 dark:bg-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-transparent focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="submit"
              loading={loading}
              icon={Flag}
            >
              Submit Report
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
