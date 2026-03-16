import { useState } from 'react';
import './App.css';
import TypeScriptOnlyDemo from './components/TypeScriptOnlyDemo';
import ZodValidationDemo from './components/ZodValidationDemo';
import SuperstructValidationDemo from './components/SuperstructValidationDemo';
import TypanionValidationDemo from './components/TypanionValidationDemo';
import { TEST_CASES } from './data/testCases';

type Tab = 'typescript' | 'zod' | 'superstruct' | 'typanion';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('typescript');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Frontend Validation Strategy — Proof of Concept</h1>
        <p className="subtitle">
          Reindeer Husbandry Accounting System · Slaughter Record Validation
        </p>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'typescript' ? 'active' : ''}`}
          onClick={() => setActiveTab('typescript')}
        >
          Approach 1: TypeScript Only
        </button>
        <button
          className={`tab-btn ${activeTab === 'zod' ? 'active' : ''}`}
          onClick={() => setActiveTab('zod')}
        >
          Approach 2: TypeScript + Zod
        </button>
        <button
          className={`tab-btn ${activeTab === 'superstruct' ? 'active' : ''}`}
          onClick={() => setActiveTab('superstruct')}
        >
          Approach 3: TypeScript + Superstruct
        </button>
        <button
          className={`tab-btn ${activeTab === 'typanion' ? 'active' : ''}`}
          onClick={() => setActiveTab('typanion')}
        >
          Approach 4: TypeScript + Typanion
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'typescript' && <TypeScriptOnlyDemo testCases={TEST_CASES} />}
        {activeTab === 'zod' && <ZodValidationDemo testCases={TEST_CASES} />}
        {activeTab === 'superstruct' && <SuperstructValidationDemo testCases={TEST_CASES} />}
        {activeTab === 'typanion' && <TypanionValidationDemo testCases={TEST_CASES} />}
      </main>
    </div>
  );
}

export default App;
