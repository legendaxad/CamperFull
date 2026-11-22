import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { persistor, store } from '@/app/store'
import { PageLoader } from '@/components/common/PageLoader'
import { router } from '@/routes/router'
import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      {/* PersistGate delays rendering until persisted state is rehydrated, so pages never flash empty data. */}
      <PersistGate loading={<PageLoader label="Restoring your session…" />} persistor={persistor}>
        <RouterProvider router={router} />
      </PersistGate>
    </Provider>
  </StrictMode>,
)
