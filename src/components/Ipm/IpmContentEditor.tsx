import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, FileEdit } from 'lucide-react';
import { DEFAULT_CONTENT_SECTIONS, CONTENT_SECTION_LABELS } from './IpmContractData';

interface IpmContentEditorProps {
  contentSections: Record<string, string>;
  onChange: (sections: Record<string, string>) => void;
}

const IpmContentEditor: React.FC<IpmContentEditorProps> = ({ contentSections, onChange }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const getValue = (key: string) => contentSections[key] ?? DEFAULT_CONTENT_SECTIONS[key] ?? '';

  const handleChange = (key: string, value: string) => {
    onChange({ ...contentSections, [key]: value });
  };

  const handleReset = (key: string) => {
    const updated = { ...contentSections };
    delete updated[key];
    onChange(updated);
  };

  const modifiedCount = Object.keys(contentSections).filter(
    k => contentSections[k] !== undefined && contentSections[k] !== DEFAULT_CONTENT_SECTIONS[k]
  ).length;

  const sectionKeys = Object.keys(CONTENT_SECTION_LABELS);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <FileEdit size={16} className="text-blue-600" />
          Icerik Duzenleme
          {modifiedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
              {modifiedCount} degisiklik
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-1.5 max-h-[500px] overflow-y-auto">
          <p className="text-[10px] text-gray-400 mb-3">
            Her bolumun metnini duzenleyebilirsiniz. Degiskenler: {'{customer_name}'}, {'{customer_address}'}, {'{customer_city}'}, {'{contract_firm_name}'}, {'{responsible_person}'}, {'{routine_frequency}'}, {'{start_date}'}
          </p>

          {sectionKeys.map(key => {
            const isExpanded = expandedSection === key;
            const isModified = contentSections[key] !== undefined && contentSections[key] !== DEFAULT_CONTENT_SECTIONS[key];

            return (
              <div key={key} className={`border rounded-lg overflow-hidden ${isModified ? 'border-amber-300' : 'border-gray-200'}`}>
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : key)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors ${
                    isExpanded ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {CONTENT_SECTION_LABELS[key]}
                    {isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </span>
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {isExpanded && (
                  <div className="p-3 border-t bg-white">
                    <textarea
                      value={getValue(key)}
                      onChange={e => handleChange(key, e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-mono leading-relaxed resize-y focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
                      rows={Math.max(3, getValue(key).split('\n').length + 1)}
                    />
                    {isModified && (
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleReset(key)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <RotateCcw size={10} /> Varsayilana don
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IpmContentEditor;
