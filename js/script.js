// Variables globales
let tiempoSimulacion = 0; // en minutos desde las 11:00
let intervalo;
let clientesEnNegocio = [];
let colaCaja = [];
let colaMostrador = [];
let salonRojo = [];
let salonAzul = [];
let ultimoIdCliente = 0;
let estadisticas = {
  tiempoPermanenciaTotal: 0,
  clientesAtendidos: 0,
  tiempoColaCajaTotal: 0,
  historialMostrador: [],
  historialSalones: []
};

// Configuración
const config = {
  tiempoEntreClientes: { min: 30, max: 90 }, // 60 +/- 30 segundos
  tiempoAtencionCaja: { min: 15, max: 45 }, // 30 +/- 15 segundos
  tiempoPreparacionLocal: { min: 80, max: 100 }, // 90 +/- 10 segundos
  tiempoPreparacionLlevar: { min: 100, max: 140 }, // 120 +/- 20 segundos
  probLlevar: 0.2,
  probSalonRojo: 0.3,
  capacidadSalonRojo: 30,
  capacidadSalonAzul: 40,
  personalMostrador: 3
};

// Horarios de permanencia en salones
const horariosSalones = [
  { inicio: 0, fin: 60, rojo: { min: 5, max: 35 }, azul: { min: 20, max: 40 } }, // 11-12
  { inicio: 60, fin: 150, rojo: { min: 15, max: 45 }, azul: { min: 30, max: 50 } }, // 12-13:30
  { inicio: 150, fin: 215, rojo: { min: 20, max: 50 }, azul: { min: 35, max: 55 } }, // 13:30-14:35
  { inicio: 215, fin: 260, rojo: { min: 5, max: 35 }, azul: { min: 25, max: 45 } }  // 14:35-15:20
];

// Elementos UI
const startBtn = document.getElementById("startBtn");
const instantBtn = document.getElementById("instantBtn");
const restartBtn = document.getElementById("restartBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Clase Cliente
class Cliente {
  constructor(id, tiempoLlegada) {
    this.id = id;
    this.tiempoLlegada = tiempoLlegada;
    this.tiempoEntradaCaja = 0;
    this.tiempoSalidaCaja = 0;
    this.tiempoEntradaMostrador = 0;
    this.tiempoSalidaMostrador = 0;
    this.tiempoEntradaSalon = 0;
    this.tiempoSalidaSalon = 0;
    this.paraLlevar = Math.random() < config.probLlevar;
    this.salonRojo = !this.paraLlevar && Math.random() < config.probSalonRojo;
    this.tiempoPreparacion = this.paraLlevar ? 
      randomBetween(config.tiempoPreparacionLlevar.min, config.tiempoPreparacionLlevar.max) :
      randomBetween(config.tiempoPreparacionLocal.min, config.tiempoPreparacionLocal.max);
  }
}

// Helper functions
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(minutos) {
  const horas = Math.floor(11 + minutos / 60);
  const mins = minutos % 60;
  return `${horas}:${mins < 10 ? '0' : ''}${mins}`;
}

function obtenerHorarioActual(minutos) {
  return horariosSalones.find(h => minutos >= h.inicio && minutos < h.fin) || horariosSalones[0];
}

// Funciones de simulación
function generarClientes(tiempoActual) {
  // Probabilidad de llegada basada en el tiempo entre clientes
  const tiempoEntreClientes = randomBetween(config.tiempoEntreClientes.min, config.tiempoEntreClientes.max);
  const probabilidadLlegada = 1 / (tiempoEntreClientes / 60); // Convertir a minutos
  
  if (Math.random() < probabilidadLlegada) {
    const nuevoCliente = new Cliente(++ultimoIdCliente, tiempoActual);
    colaCaja.push(nuevoCliente);
    clientesEnNegocio.push(nuevoCliente);
  }
}

function atenderCaja(tiempoActual) {
  // Atender clientes en caja
  if (colaCaja.length > 0) {
    const cliente = colaCaja[0];
    if (!cliente.tiempoEntradaCaja) {
      cliente.tiempoEntradaCaja = tiempoActual;
      const tiempoAtencion = randomBetween(config.tiempoAtencionCaja.min, config.tiempoAtencionCaja.max) / 60;
      cliente.tiempoSalidaCaja = tiempoActual + tiempoAtencion;
    }
    
    // Mover a mostrador cuando termina atención
    if (cliente.tiempoSalidaCaja <= tiempoActual) {
      cliente.tiempoEntradaMostrador = tiempoActual;
      colaMostrador.push(cliente);
      colaCaja.shift();
      
      // Registrar tiempo en cola
      estadisticas.tiempoColaCajaTotal += (cliente.tiempoEntradaCaja - cliente.tiempoLlegada);
    }
  }
}

function atenderMostrador(tiempoActual) {
  // Atender hasta 3 clientes simultáneamente
  const clientesEnPreparacion = clientesEnNegocio.filter(c => 
    c.tiempoEntradaMostrador > 0 && 
    !c.tiempoSalidaMostrador && 
    c.tiempoSalidaMostrador === 0
  );
  
  // Asignar tiempo de salida a nuevos clientes si hay capacidad
  colaMostrador.slice(0, config.personalMostrador - clientesEnPreparacion.length).forEach(cliente => {
    if (!cliente.tiempoSalidaMostrador) {
      cliente.tiempoSalidaMostrador = tiempoActual + (cliente.tiempoPreparacion / 60);
    }
  });
  
  // Registrar estadísticas cada 15 minutos
  if (tiempoActual % 15 === 0) {
    estadisticas.historialMostrador.push({
      tiempo: tiempoActual,
      cantidad: colaMostrador.length
    });
  }
  
  // Mover clientes con pedido listo
  clientesEnNegocio.filter(c => c.tiempoSalidaMostrador > 0 && c.tiempoSalidaMostrador <= tiempoActual).forEach(cliente => {
    if (cliente.paraLlevar) {
      // Cliente se va
      finalizarCliente(cliente, tiempoActual);
    } else {
      // Ir a salón
      const horario = obtenerHorarioActual(tiempoActual);
      const tiempoPermanencia = cliente.salonRojo ? 
        randomBetween(horario.rojo.min, horario.rojo.max) :
        randomBetween(horario.azul.min, horario.azul.max);
      
      cliente.tiempoEntradaSalon = tiempoActual;
      cliente.tiempoSalidaSalon = tiempoActual + tiempoPermanencia;
      
      if (cliente.salonRojo && salonRojo.length < config.capacidadSalonRojo) {
        salonRojo.push(cliente);
      } else if (!cliente.salonRojo && salonAzul.length < config.capacidadSalonAzul) {
        salonAzul.push(cliente);
      }
    }
    
    // Quitar de cola mostrador
    colaMostrador = colaMostrador.filter(c => c.id !== cliente.id);
  });
}

function gestionarSalones(tiempoActual) {
  // Registrar estadísticas cada 30 minutos
  if (tiempoActual % 30 === 0) {
    estadisticas.historialSalones.push({
      tiempo: tiempoActual,
      salonRojo: salonRojo.length,
      salonAzul: salonAzul.length
    });
  }
  
  // Salida de clientes de salones
  salonRojo.forEach(cliente => {
    if (cliente.tiempoSalidaSalon <= tiempoActual) {
      finalizarCliente(cliente, tiempoActual);
    }
  });
  
  salonAzul.forEach(cliente => {
    if (cliente.tiempoSalidaSalon <= tiempoActual) {
      finalizarCliente(cliente, tiempoActual);
    }
  });
  
  // Limpiar salones
  salonRojo = salonRojo.filter(c => c.tiempoSalidaSalon > tiempoActual);
  salonAzul = salonAzul.filter(c => c.tiempoSalidaSalon > tiempoActual);
}

function finalizarCliente(cliente, tiempoActual) {
  cliente.tiempoSalida = tiempoActual;
  const tiempoPermanencia = cliente.tiempoSalida - cliente.tiempoLlegada;
  estadisticas.tiempoPermanenciaTotal += tiempoPermanencia;
  estadisticas.clientesAtendidos++;
  
  // Quitar de arrays
  clientesEnNegocio = clientesEnNegocio.filter(c => c.id !== cliente.id);
}

// Función principal de simulación
function ejecutarSimulacion() {
  intervalo = setInterval(() => {
    tiempoSimulacion += 1;
    
    generarClientes(tiempoSimulacion);
    atenderCaja(tiempoSimulacion);
    atenderMostrador(tiempoSimulacion);
    gestionarSalones(tiempoSimulacion);
    actualizarUI();
    
    if (tiempoSimulacion >= 260) {
      clearInterval(intervalo);
      mostrarEstadisticasFinales();
      console.log("Simulación completada.");
    }
  }, 100); // 100ms = 1 minuto simulado
}

function avanzarTiempo(minutos) {
  for (let i = 0; i < minutos; i++) {
    tiempoSimulacion += 1;
    
    generarClientes(tiempoSimulacion);
    atenderCaja(tiempoSimulacion);
    atenderMostrador(tiempoSimulacion);
    gestionarSalones(tiempoSimulacion);
    
    if (tiempoSimulacion >= 260) {
      clearInterval(intervalo);
      mostrarEstadisticasFinales();
      console.log("Simulación completada.");
      break;
    }
  }
  actualizarUI();
}

function mostrarEstadisticasFinales() {
  console.log("--- ESTADÍSTICAS FINALES ---");
  console.log(`Clientes atendidos: ${estadisticas.clientesAtendidos}`);
  console.log(`Tiempo promedio de permanencia: ${(estadisticas.tiempoPermanenciaTotal / estadisticas.clientesAtendidos).toFixed(2)} minutos`);
  console.log(`Tiempo promedio en cola de caja: ${(estadisticas.tiempoColaCajaTotal / estadisticas.clientesAtendidos).toFixed(2)} minutos`);
  
  console.log("\nHistorial de cola en mostrador (cada 15 minutos):");
  estadisticas.historialMostrador.forEach(registro => {
    console.log(`${formatTime(registro.tiempo)}: ${registro.cantidad} clientes`);
  });
  
  console.log("\nHistorial de ocupación en salones (cada 30 minutos):");
  estadisticas.historialSalones.forEach(registro => {
    console.log(`${formatTime(registro.tiempo)}: Salón Rojo=${registro.salonRojo}, Salón Azul=${registro.salonAzul}`);
  });
}

// UI Functions
function actualizarUI() {
  document.getElementById("tiempoNegocio").textContent = formatTime(tiempoSimulacion);
  document.getElementById("cajaCount").textContent = colaCaja.length;
  document.getElementById("mostradorCount").textContent = colaMostrador.length;
  document.getElementById("salonRojoCount").textContent = salonRojo.length;
  document.getElementById("salonAzulCount").textContent = salonAzul.length;
  
  posicionarClientesFinal(
    colaCaja.length,
    colaMostrador.length,
    salonRojo.length,
    salonAzul.length
  );
}

function dibujarEscenario() {
  ctx.fillStyle = "white";
  ctx.fillRect(20, 20, 560, 360);
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(350, 120, 200, 100);
  ctx.fillStyle = "#4040d6";
  ctx.fillRect(350, 250, 200, 100);
  ctx.fillStyle = "#c0c0c0";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(320, 340 - i * 10, 25, 5);
  }
  ctx.fillStyle = "#000000";
  ctx.font = "0.85rem Arial";
  ctx.fillText("CAJA", 90, 40);
  ctx.fillText("MOSTRADOR", 210, 40);
  ctx.fillText("SALÓN ROJO", 400, 115);
  ctx.fillText("SALÓN AZUL", 400, 245);
  ctx.fillText("ENTRADA", 50, 395);
}

function posicionarClientesFinal(caja, mostrador, rojo, azul) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dibujarEscenario();
  ctx.fillStyle = "#000000";
  for (let i = 0; i < caja; i++)
    ctx.fillRect(55 + (i % 5) * 20, 55 + Math.floor(i / 5) * 20, 10, 10);
  for (let i = 0; i < mostrador; i++)
    ctx.fillRect(185 + (i % 5) * 20, 55 + Math.floor(i / 5) * 20, 10, 10);
  for (let i = 0; i < rojo; i++)
    ctx.fillRect(350 + (i % 10) * 15, 140 + Math.floor(i / 10) * 15, 10, 10);
  for (let i = 0; i < azul; i++)
    ctx.fillRect(350 + (i % 10) * 15, 280 + Math.floor(i / 10) * 15, 10, 10);
}

// Event Listeners
startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  instantBtn.style.display = "block";
  restartBtn.style.display = "block";
  ejecutarSimulacion();
});

instantBtn.addEventListener("click", function() {
  clearInterval(intervalo);
  console.log("Simulación detenida.");
  instantBtn.textContent = "Simulación Detenida";
  instantBtn.classList.remove("btn-danger");
  instantBtn.classList.add("btn-secondary");
});

restartBtn.addEventListener("click", () => location.reload());

// Inicialización
dibujarEscenario();