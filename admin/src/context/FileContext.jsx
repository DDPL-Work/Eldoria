import React from 'react';
import { useFiles } from '../store/hooks';

export { useFiles };

export function FileProvider({ children }) {
  return <>{children}</>;
}

export default FileProvider;
