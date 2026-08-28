import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">+</span>
          </div>
          <span className="text-2xl font-extrabold text-blue-900 tracking-tight">PharmaShare</span>
        </div>
        <div className="space-x-6 hidden md:block text-slate-600 font-medium">
          <a href="#beneficios" className="hover:text-blue-600 transition">Beneficios</a>
          <a href="#como-funciona" className="hover:text-blue-600 transition">¿Cómo funciona?</a>
          <a href="#precios" className="hover:text-blue-600 transition">Planes</a>
        </div>
        <div className="space-x-4">
          <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-800 transition">Ingresar</Link>
          <Link href="/registro" className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-blue-700 transition shadow-md">
            Registrar Farmacia
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden bg-blue-900 text-white py-24 px-8 md:px-16 flex flex-col items-center text-center">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight relative z-10">
          Minimizá las pérdidas por vencimientos en tu farmacia
        </h1>
        <p className="mt-6 text-xl md:text-2xl text-blue-100 max-w-2xl relative z-10 font-light">
          Únete a la primera red colaborativa de farmacias. Gestioná tu stock, derivá clientes y conectá medicamentos próximos a vencer con quienes los necesitan.
        </p>
        <div className="mt-10 flex gap-4 relative z-10">
          <Link href="/registro" className="bg-emerald-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            Probar Sistema Gratis
          </Link>
          <a href="#como-funciona" className="bg-white/10 text-white border border-white/30 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition backdrop-blur-sm">
            Ver Demo
          </a>
        </div>
      </header>

      {/* Benefits / Features */}
      <section id="beneficios" className="py-20 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-800">Todo lo que necesitas en una sola plataforma</h2>
          <p className="mt-4 text-slate-600">Diseñado específicamente para las necesidades del farmacéutico moderno.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 text-2xl">📦</div>
            <h3 className="text-xl font-bold mb-3">Gestión con Código de Barras</h3>
            <p className="text-slate-600">Cargá tu inventario rápidamente usando tu lector de código de barras USB. Base de datos auto-completada.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">CORE</div>
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-6 text-2xl">🤝</div>
            <h3 className="text-xl font-bold mb-3">Red de Vencimientos</h3>
            <p className="text-slate-600">Si un medicamento vence en menos de 6 meses, publicalo en la red. Intercambialo o enviá al cliente a una sucursal colega.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 text-2xl">💬</div>
            <h3 className="text-xl font-bold mb-3">Chat en Tiempo Real</h3>
            <p className="text-slate-600">Comunicate instantáneamente con otras farmacias de tu zona para coordinar intercambios o consultar faltantes.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="bg-slate-100 py-20 px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-12">Planes Simples y Transparentes</h2>
          <div className="flex flex-col md:flex-row justify-center items-center gap-8">
            <div className="bg-white p-10 rounded-3xl shadow-md max-w-sm w-full border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-800">Mensual</h3>
              <div className="my-4">
                <span className="text-4xl font-extrabold">$1.500</span><span className="text-slate-500">/mes</span>
              </div>
              <ul className="text-left space-y-4 mb-8 text-slate-600">
                <li>✅ Acceso a la Red de Vencimientos</li>
                <li>✅ Chat Global y Privado</li>
                <li>✅ Soporte 24/7</li>
                <li>✅ Facturación Electrónica AFIP</li>
              </ul>
              <button className="w-full bg-blue-100 text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-200 transition">
                Suscribirse
              </button>
            </div>
            
            <div className="bg-blue-900 text-white p-10 rounded-3xl shadow-xl max-w-sm w-full relative transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-sm">
                MÁS POPULAR (2 Meses Gratis)
              </div>
              <h3 className="text-2xl font-bold">Anual</h3>
              <div className="my-4">
                <span className="text-4xl font-extrabold">$15.000</span><span className="text-blue-200">/año</span>
              </div>
              <ul className="text-left space-y-4 mb-8 text-blue-100">
                <li>✅ Todos los beneficios del plan Mensual</li>
                <li>✅ Ahorro del 16% (2 meses gratis)</li>
                <li>✅ Asignación de prioridad en búsquedas</li>
                <li>✅ Factura C / A automatizada</li>
              </ul>
              <button className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition shadow-lg">
                Suscribirse con MercadoPago
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">+</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">PharmaShare</span>
        </div>
        <p>© 2026 PharmaShare Argentina. Todos los derechos reservados.</p>
        <p className="mt-2 text-sm">Integra: MercadoPago & AFIP Web Services</p>
      </footer>
    </div>
  );
}
