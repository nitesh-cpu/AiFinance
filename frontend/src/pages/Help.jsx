import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, HelpCircle, Mail, MessageSquare, BookOpen, Shield, Target, Sparkles, FileText, ArrowRightLeft } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { helpFAQs } from '../data/mockData';
import { useToast } from '../context/ToastContext';

export const Help = () => {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  const categories = [
    { title: 'Getting Started', desc: 'Learn the basics', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
    { title: 'Transactions', desc: 'Manage your money', icon: ArrowRightLeft, color: 'text-emerald-600 bg-emerald-50' },
    { title: 'Budgets', desc: 'Control your spending', icon: Target, color: 'text-purple-600 bg-purple-50' },
    { title: 'AI Insights', desc: 'Understand AI engine', icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
    { title: 'Security & Privacy', desc: 'Keep data safe', icon: Shield, color: 'text-rose-600 bg-rose-50' },
    { title: 'Reports', desc: 'Generate reports', icon: FileText, color: 'text-indigo-600 bg-indigo-50' },
  ];

  const filteredFaqs = helpFAQs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendSupport = (e) => {
    e.preventDefault();
    if (!supportMsg) return;
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsSupportModalOpen(false);
      setSupportMsg('');
      addToast('Support ticket submitted successfully! Our team will respond shortly.', 'success');
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2 py-4">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Help Center</h1>
        <p className="text-xs text-slate-500">How can we help you today? Find answers about SpendSense.</p>

        {/* Search Bar */}
        <div className="relative mt-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search help articles, FAQs..."
            className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Quick Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div
              key={idx}
              onClick={() => addToast(`Browsing ${cat.title} articles`, 'info')}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition cursor-pointer flex items-center gap-3"
            >
              <div className={`p-3 rounded-xl ${cat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{cat.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Accordion Section */}
      <Card title="Frequently Asked Questions" subtitle="Instant answers to common SpendSense questions">
        <div className="divide-y divide-slate-100">
          {filteredFaqs.length === 0 ? (
            <p className="p-4 text-xs text-slate-500 text-center">No matching help articles found.</p>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div key={faq.id} className="py-3">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                    className="w-full flex items-center justify-between text-left font-bold text-xs text-slate-900 hover:text-blue-600 transition"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60 animate-fadeIn">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Still Need Help Box */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Still need help?</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Our support team can help you with your account, integration or custom queries.
            </p>
          </div>
          <Button
            variant="primary"
            icon={Mail}
            onClick={() => setIsSupportModalOpen(true)}
          >
            Contact Support
          </Button>
        </div>
      </Card>

      {/* Support Modal */}
      <Modal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} title="Contact SpendSense Support">
        <form onSubmit={handleSendSupport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              defaultValue="General Account Inquiry"
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
            <textarea
              rows={4}
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              required
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setIsSupportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" type="submit" isLoading={isSending}>
              Send Message
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
