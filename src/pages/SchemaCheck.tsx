
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SchemaCheck = () => {
    const [schema, setSchema] = useState<any>(null);

    useEffect(() => {
        const fetchSchema = async () => {
            const { data, error } = await supabase.from('biocidal_products').select('*').limit(1);
            if (data && data.length > 0) {
                setSchema(Object.keys(data[0]));
            } else {
                setSchema('No data or error: ' + (error?.message || 'Empty'));
            }
        }
        fetchSchema();
    }, []);

    if (!schema) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'white', padding: 20, border: '2px solid red' }}>
            <h3>Biocidal Products Schema Keys:</h3>
            <pre>{JSON.stringify(schema, null, 2)}</pre>
            <button onClick={() => setSchema(null)}>Close</button>
        </div>
    );
};

export default SchemaCheck;
