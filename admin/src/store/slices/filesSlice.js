import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const compressImage = async (file, maxDim = 1200, maxChars = 2400000) => {
  const url = await readAsDataURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });

  let dim = maxDim;
  let q = 0.82;
  let out = '';
  for (let k = 0; k < 10; k++) {
    const s = Math.min(1, dim / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * s));
    c.height = Math.max(1, Math.round(img.height * s));
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL('image/jpeg', q);
    if (out.length <= maxChars) return out;
    if (q > 0.56) q -= 0.1;
    else dim = Math.round(dim * 0.8);
  }
  return out;
};

/**
 * Async Thunk: Upload and compress file
 */
export const uploadFileThunk = createAsyncThunk(
  'files/uploadFile',
  async ({ file, maxDim = 1200 }, { rejectWithValue }) => {
    try {
      const isImg = /^image\//.test(file.type);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isImg && !isPdf) throw new Error('Upload a photo (JPG or PNG) or a PDF.');

      let data;
      if (isImg) {
        data = await compressImage(file, maxDim);
      } else {
        data = await readAsDataURL(file);
      }

      const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const meta = {
        name: String(file.name || 'file').slice(0, 80),
        type: isImg ? 'image/jpeg' : 'application/pdf',
        size: Math.round(data.length * 0.75),
        data,
      };

      return { id, meta };
    } catch (err) {
      return rejectWithValue(err.message || 'File upload failed');
    }
  }
);

const filesSlice = createSlice({
  name: 'files',
  initialState: {
    cache: {},
    uploading: false,
    error: null,
  },
  reducers: {
    cacheFile: (state, action) => {
      const { id, fileData } = action.payload;
      state.cache[id] = fileData;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadFileThunk.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadFileThunk.fulfilled, (state, action) => {
        state.uploading = false;
        state.cache[action.payload.id] = action.payload.meta;
      })
      .addCase(uploadFileThunk.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      });
  },
});

export const { cacheFile } = filesSlice.actions;
export { compressImage };
export default filesSlice.reducer;
