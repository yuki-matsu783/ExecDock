import { useCallback, useState, useEffect } from 'react';

/**
 * ランタイム（Node.js/Python）の実行と利用可能性チェックを管理するカスタムフック
 */
const useRuntime = () => {
  const [nodeAvailable, setNodeAvailable] = useState<boolean>(false);
  const [pythonAvailable, setPythonAvailable] = useState<boolean>(false);
  const [checkingAvailability, setCheckingAvailability] = useState<boolean>(true);

  // 各ランタイムの利用可能性をチェック
  useEffect(() => {
    const checkRuntimeAvailability = async () => {
      // Electronの場合のみチェックを実行
      if (window.api?.runtime) {
        try {
          const [nodeResult, pythonResult] = await Promise.all([
            window.api.runtime.checkAvailability('node'),
            window.api.runtime.checkAvailability('python')
          ]);
          
          setNodeAvailable(nodeResult);
          setPythonAvailable(pythonResult);
        } catch (error) {
          console.error('Runtime availability check failed:', error);
          setNodeAvailable(false);
          setPythonAvailable(false);
        } finally {
          setCheckingAvailability(false);
        }
      } else {
        // Web版など、Electron APIがない場合は利用不可
        setNodeAvailable(false);
        setPythonAvailable(false);
        setCheckingAvailability(false);
      }
    };

    checkRuntimeAvailability();
  }, []);

  /**
   * Node.jsコマンドを実行する
   * @param args Node.jsに渡す引数（スクリプトファイルやコマンドライン引数）
   */
  const executeNode = useCallback(async (args: string): Promise<boolean> => {
    if (!window.api?.runtime || !nodeAvailable) {
      console.warn('Node.js runtime is not available');
      return false;
    }

    try {
      return await window.api.runtime.executeNode(args);
    } catch (error) {
      console.error('Failed to execute Node.js command:', error);
      return false;
    }
  }, [nodeAvailable]);

  /**
   * Pythonコマンドを実行する
   * @param args Pythonに渡す引数（スクリプトファイルやコマンドライン引数）
   */
  const executePython = useCallback(async (args: string): Promise<boolean> => {
    if (!window.api?.runtime || !pythonAvailable) {
      console.warn('Python runtime is not available');
      return false;
    }

    try {
      return await window.api.runtime.executePython(args);
    } catch (error) {
      console.error('Failed to execute Python command:', error);
      return false;
    }
  }, [pythonAvailable]);

  return {
    nodeAvailable,
    pythonAvailable,
    checkingAvailability,
    executeNode,
    executePython
  };
};

export default useRuntime;