import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'flowbite-react';
import App from './App';
import './index.css';

// Coffee-toned Flowbite custom theme — forced light mode
const flowbiteTheme = {
  theme: {
    // Force Table to always use visible text colors
    table: {
      root: {
        base: 'w-full text-left text-sm text-gray-700',
        shadow: 'absolute left-0 top-0 -z-10 mt-2 h-full w-full rounded-lg bg-white drop-shadow-md dark:bg-black',
        wrapper: 'relative',
      },
      body: {
        base: 'group/body',
        cell: {
          base: 'px-4 py-3 text-gray-700',
        },
      },
      head: {
        base: 'group/head text-xs uppercase text-gray-600',
        cell: {
          base: 'bg-coffee-50 px-4 py-3 text-coffee-700 font-semibold',
        },
      },
      row: {
        base: 'group/row',
        hovered: 'hover:bg-coffee-50/60',
        striped: 'odd:bg-white even:bg-gray-50/40',
      },
    },
    // Button colors
    button: {
      color: {
        primary: {
          base: 'group flex items-center justify-center p-0.5 text-center font-medium relative focus:z-10 focus:outline-none text-white bg-amber-500 border border-transparent enabled:hover:bg-amber-600 focus:ring-amber-300',
        },
        coffee: {
          base: 'group flex items-center justify-center p-0.5 text-center font-medium relative focus:z-10 focus:outline-none text-white bg-coffee-800 border border-transparent enabled:hover:bg-coffee-700 focus:ring-coffee-300',
        },
      },
    },
    // Card with coffee border
    card: {
      root: {
        base: 'flex rounded-xl border border-coffee-100 bg-white shadow-card',
        children: 'flex h-full flex-col justify-center gap-4 p-5',
        horizontal: {
          off: 'flex-col',
          on: 'flex-col md:flex-row',
        },
        href: 'hover:bg-coffee-50',
      },
    },
    // Badge colors
    badge: {
      root: {
        base: 'flex h-fit items-center gap-1 font-semibold',
      },
      color: {
        info: 'bg-blue-100 text-blue-800 border border-blue-200',
        success: 'bg-green-100 text-green-800 border border-green-200',
        warning: 'bg-amber-100 text-amber-800 border border-amber-200',
        failure: 'bg-red-100 text-red-800 border border-red-200',
        purple: 'bg-violet-100 text-violet-800 border border-violet-200',
        indigo: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
        pink: 'bg-pink-100 text-pink-800 border border-pink-200',
        gray: 'bg-gray-100 text-gray-700 border border-gray-200',
      },
    },
    // Tabs with amber underline
    tabs: {
      tablist: {
        base: 'flex text-center',
        styles: {
          underline: '-mb-px flex-wrap border-b border-gray-200',
        },
        tabitem: {
          base: 'flex items-center justify-center rounded-t-lg p-4 text-sm font-medium first:ml-0 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400',
          styles: {
            underline: {
              base: 'rounded-t-lg border-b-2',
              active: {
                on: 'active rounded-t-lg border-b-2 border-amber-500 text-amber-600',
                off: 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-600',
              },
            },
          },
        },
      },
    },
    // TextInput
    textInput: {
      field: {
        input: {
          base: 'block w-full border disabled:cursor-not-allowed disabled:opacity-50 bg-white text-gray-900 placeholder:text-gray-400',
          colors: {
            gray: 'bg-white border-gray-300 text-gray-900 focus:border-amber-400 focus:ring-amber-300',
          },
        },
      },
    },
    // Select
    select: {
      field: {
        select: {
          base: 'block w-full border disabled:cursor-not-allowed disabled:opacity-50 bg-white text-gray-900',
          colors: {
            gray: 'bg-white border-gray-300 text-gray-900 focus:border-amber-400 focus:ring-amber-300',
          },
        },
      },
    },
    // Modal
    modal: {
      root: {
        base: 'fixed inset-x-0 top-0 z-50 h-screen overflow-y-auto overflow-x-hidden md:inset-0 md:h-full',
        show: {
          on: 'flex bg-gray-900/60 backdrop-blur-sm',
          off: 'hidden',
        },
      },
      content: {
        base: 'relative h-full w-full p-4 md:h-auto',
        inner: 'relative flex max-h-[90dvh] flex-col rounded-2xl bg-white shadow-modal',
      },
      header: {
        base: 'flex items-start justify-between rounded-t-2xl border-b border-gray-100 p-5',
        title: 'text-lg font-semibold text-gray-900',
      },
      body: {
        base: 'flex-1 overflow-auto p-5',
        popup: 'pt-0',
      },
      footer: {
        base: 'flex items-center space-x-3 rounded-b-2xl border-t border-gray-100 p-5',
        popup: 'justify-center',
      },
    },
    // Pagination
    pagination: {
      pages: {
        selector: {
          active: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-300',
        },
      },
    },
    // Toast
    toast: {
      root: {
        base: 'flex w-full max-w-xs items-center rounded-xl bg-white p-4 text-gray-500 shadow-xl border border-gray-100',
      },
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={flowbiteTheme}>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
