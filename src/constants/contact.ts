import { FaWhatsapp, FaTelegram, FaDiscord } from 'react-icons/fa';
import { MdChat } from 'react-icons/md';
import { SiSignal } from 'react-icons/si';

export const CONTACT_OPTIONS = [
  { 
    id: 'whatsapp', 
    label: 'WhatsApp', 
    icon: FaWhatsapp,
    placeholder: '+1234567890',
    formatValue: (value: string) => `https://wa.me/${value.replace(/\D/g, '')}`
  },
  { 
    id: 'telegram', 
    label: 'Telegram', 
    icon: FaTelegram,
    placeholder: '@username',
    formatValue: (value: string) => `https://t.me/${value.replace('@', '')}`
  },
  { 
    id: 'discord', 
    label: 'Discord', 
    icon: FaDiscord,
    placeholder: 'username#1234',
    formatValue: (value: string) => value
  },
  { 
    id: 'signal', 
    label: 'Signal', 
    icon: SiSignal,
    placeholder: '+1234567890',
    formatValue: (value: string) => value
  },
  { 
    id: 'other', 
    label: 'Other', 
    icon: MdChat,
    placeholder: 'How to reach you',
    formatValue: (value: string) => value
  },
] as const; 