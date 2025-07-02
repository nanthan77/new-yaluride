import React, { useState, useEffect, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { Wallet, Plus, ArrowDown, ArrowUp, X, Loader2 } from 'lucide-react';

// --- Type Definitions ---
enum TransactionType {
  TOP_UP = 'TOP_UP',
  RIDE_PAYMENT = 'RIDE_PAYMENT',
  REFUND = 'REFUND',
  BID_HOLD = 'BID_HOLD',
  BID_RELEASE = 'BID_RELEASE',
}

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: string;
}

// --- Mock Data (replace with Redux selectors) ---
const useMockWalletData = () => {
  const [balance, setBalance] = useState(2500.75);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 'txn1', type: TransactionType.RIDE_PAYMENT, amount: -450, description: 'Ride to Galle Face', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'txn2', type: TransactionType.TOP_UP, amount: 3000, description: 'Card Top-Up', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'txn3', type: TransactionType.RIDE_PAYMENT, amount: -250.50, description: 'Ride to Mount Lavinia', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'txn4', type: TransactionType.REFUND, amount: 150, description: 'Refund for cancelled ride', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  ]);

  const addBalance = (amount: number) => {
    setBalance(prev => prev + amount);
    setTransactions(prev => [{
        id: `txn_${crypto.randomUUID()}`,
        type: TransactionType.TOP_UP,
        amount,
        description: 'Card Top-Up',
        timestamp: new Date().toISOString()
    }, ...prev]);
  };

  return { balance, transactions, addBalance };
};


// --- UI Components ---

const BalanceCard: React.FC<{ balance: number; onTopUp: () => void }> = ({ balance, onTopUp }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
      <p className="text-sm opacity-80">{t('wallet.currentBalance')}</p>
      <p className="text-4xl font-bold mt-1">LKR {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <button
        onClick={onTopUp}
        className="mt-6 w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
      >
        <Plus size={20} className="mr-2" />
        {t('wallet.topUpButton')}
      </button>
    </div>
  );
};

const TransactionHistory: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const { t } = useTranslation();

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.TOP_UP:
        return <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full"><ArrowUp className="h-5 w-5 text-green-600 dark:text-green-300" /></div>;
      case TransactionType.RIDE_PAYMENT:
        return <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full"><ArrowDown className="h-5 w-5 text-red-600 dark:text-red-300" /></div>;
      case TransactionType.REFUND:
        return <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full"><ArrowUp className="h-5 w-5 text-blue-600 dark:text-blue-300" /></div>;
      default:
        return <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-full"><Wallet className="h-5 w-5 text-gray-500 dark:text-gray-300" /></div>;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('wallet.transactionHistory')}</h2>
      <div className="space-y-3">
        {transactions.length > 0 ? (
          transactions.map((tx, index) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            >
              <div className="flex items-center">
                {getTransactionIcon(tx.type)}
                <div className="ml-4">
                  <p className="font-medium text-gray-800 dark:text-gray-100">{tx.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
              <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {tx.amount > 0 ? '+' : ''}LKR {tx.amount.toFixed(2)}
              </p>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>{t('wallet.noTransactions')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TopUpModal: React.FC<{ isOpen: boolean; onClose: () => void; onTopUp: (amount: number) => Promise<void> }> = ({ isOpen, onClose, onTopUp }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState(1000);
    const [isLoading, setIsLoading] = useState(false);
    const presetAmounts = [500, 1000, 2000, 5000];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            toast.error(t('wallet.error.invalidAmount'));
            return;
        }
        setIsLoading(true);
        await onTopUp(amount);
        setIsLoading(false);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white flex justify-between items-center">
                                    {t('wallet.topUpModal.title')}
                                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
                                </Dialog.Title>
                                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                    <div>
                                        <label htmlFor="topup-amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('wallet.topUpModal.amountLabel')}</label>
                                        <div className="relative mt-1">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">LKR</span>
                                            <input
                                                id="topup-amount"
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(Number(e.target.value))}
                                                className="w-full h-12 pl-12 pr-4 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                placeholder="1000"
                                                min="100"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {presetAmounts.map(preset => (
                                            <button key={preset} type="button" onClick={() => setAmount(preset)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">{preset}</button>
                                        ))}
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center bg-blue-600 text-white font-bold rounded-lg h-12 hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" /> : t('wallet.topUpModal.submitButton', { amount: amount.toLocaleString() })}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};


// --- Main Page Component ---
const WalletPage: React.FC = () => {
  const { t } = useTranslation();
  const { balance, transactions, addBalance } = useMockWalletData();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  const handleTopUp = async (amount: number) => {
    // Simulate API call to payment gateway
    toast.loading(t('wallet.topUpModal.processing'));
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.dismiss();
    
    // Simulate success
    addBalance(amount);
    toast.success(t('wallet.topUpModal.success', { amount: amount.toLocaleString() }));
    setIsTopUpModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <Wallet className="mr-3 h-8 w-8 text-blue-600 dark:text-blue-400" />
          {t('wallet.title')}
        </h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <BalanceCard balance={balance} onTopUp={() => setIsTopUpModalOpen(true)} />
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <TransactionHistory transactions={transactions} />
      </motion.div>

      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        onTopUp={handleTopUp}
      />
    </div>
  );
};

export default WalletPage;
