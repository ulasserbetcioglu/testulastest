import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EditEquipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipmentItem: {
        id: string;
        equipment_code: string;
        department: string;
        equipment?: {
            name: string;
        };
    } | null;
    onSave: () => void;
}

const EditEquipmentModal: React.FC<EditEquipmentModalProps> = ({
    isOpen,
    onClose,
    equipmentItem,
    onSave
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        equipment_code: '',
        department: ''
    });

    useEffect(() => {
        if (isOpen && equipmentItem) {
            setFormData({
                equipment_code: equipmentItem.equipment_code,
                department: equipmentItem.department
            });
        }
    }, [isOpen, equipmentItem]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!equipmentItem) return;

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('branch_equipment')
                .update({
                    equipment_code: formData.equipment_code.trim(),
                    department: formData.department.trim().toUpperCase()
                })
                .eq('id', equipmentItem.id);

            if (error) throw error;

            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !equipmentItem) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold">Ekipman Düzenle</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                Ekipman Tipi
                            </label>
                            <div className="p-2 bg-gray-50 border rounded text-gray-700 font-medium">
                                {equipmentItem.equipment?.name || 'İsimsiz Ekipman'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ekipman Kodu
                            </label>
                            <input
                                type="text"
                                value={formData.equipment_code}
                                onChange={(e) => setFormData(prev => ({ ...prev, equipment_code: e.target.value }))}
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bölüm
                            </label>
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                                placeholder="Örn: MUTFAK, DEPO"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                            disabled={loading}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Güncelleniyor...' : 'Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEquipmentModal;
