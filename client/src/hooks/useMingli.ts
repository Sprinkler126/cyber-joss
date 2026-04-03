import { useEffect, useMemo, useState } from 'react';
import { calculateMingli, getFlameLevel } from '../lib/mingliCalculator';

export function useMingli() {
  const [textInput, setTextInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [mingli, setMingli] = useState(0);
  const [details, setDetails] = useState<Array<{ source: string; type: 'text' | 'image'; value: number; mingli: number }>>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsCalculating(true);
      try {
        const result = await calculateMingli(textInput, files);
        if (!cancelled) {
          setMingli(result.totalMingli);
          setDetails(result.details);
        }
      } finally {
        if (!cancelled) {
          setIsCalculating(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [textInput, files]);

  const level = useMemo(() => getFlameLevel(mingli), [mingli]);

  return {
    textInput,
    setTextInput,
    files,
    setFiles,
    mingli,
    details,
    level,
    isCalculating,
  };
}
