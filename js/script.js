// Configuración de la simulación
const CONFIG = {
  TIEMPO_MAXIMO: 260, // 4 horas y 20 minutos (11:00 a 15:20)
  INTERVALO_SIMULACION: 1000,
  ALERTA_DURACION: 5000,
  CLIENTES: {
    CAJA: { PROMEDIO: 60, VARIACION: 30 },
    MOSTRADOR: { PROMEDIO: 30, VARIACION: 15 },
    ROJO: { PROMEDIO: 30, VARIACION: 10, MAXIMO: 30 },
    AZUL: { PROMEDIO: 40, VARIACION: 10, MAXIMO: 40 },
    PREPARACION: {
      LOCAL: { PROMEDIO: 90, VARIACION: 10 },
      LLEVAR: { PROMEDIO: 120, VARIACION: 20 }
    }
  },
  HORARIOS: {
    HORA_11_12: { ROJO: { PROMEDIO: 20, VARIACION: 15 }, AZUL: { PROMEDIO: 30, VARIACION: 10 } },
    HORA_12_1330: { ROJO: { PROMEDIO: 30, VARIACION: 15 }, AZUL: { PROMEDIO: 40, VARIACION: 10 } },
    HORA_1330_1435: { ROJO: { PROMEDIO: 35, VARIACION: 15 }, AZUL: { PROMEDIO: 45, VARIACION: 10 } },
    HORA_1435_1520: { ROJO: { PROMEDIO: 20, VARIACION: 15 }, AZUL: { PROMEDIO: 35, VARIACION: 10 } }
  }
};

// Elementos del DOM
const DOM = {
  botones: {
    start: document.getElementById("startBtn"),
    instant: document.getElementById("instantBtn"),
    restart: document.getElementById("restartBtn")
  },
  canvas: document.getElementById("canvas"),
  alertContainer: document.getElementById("alertContainer"),
  contadores: {
    tiempoNegocio: document.getElementById("tiempoNegocio"),
    caja: document.getElementById("cajaCount"),
    mostrador: document.getElementById("mostradorCount"),
    salonRojo: document.getElementById("salonRojoCount"),
    salonAzul: document.getElementById("salonAzulCount")
  }
};

// Estado de la simulación
let estadoSimulacion = {
  tiempo: 0,
  intervalo: null
};

// Utilidades
const utilidades = {
  obtenerNumeroAleatorio: (promedio, variacion) => {
    return Math.round(promedio + (Math.random() * 2 - 1) * variacion);
  },

  mostrarAlerta: () => {
    const alerta = DOM.alertContainer;
    alerta.style.display = "block";
    alerta.style.opacity = "0";
    alerta.style.transform = "translateY(-20px)";
    alerta.style.transition = "all 0.3s ease-in-out";
    
    setTimeout(() => {
      alerta.style.opacity = "1";
      alerta.style.transform = "translateY(0)";
    }, 100);

    setTimeout(() => {
      alerta.style.opacity = "0";
      alerta.style.transform = "translateY(-20px)";
      setTimeout(() => {
        alerta.style.display = "none";
      }, 300);
    }, CONFIG.ALERTA_DURACION);
  }
};

// Funciones de simulación
const simulacion = {
  obtenerHorarioActual: () => {
    const tiempo = estadoSimulacion.tiempo;
    if (tiempo < 60) return CONFIG.HORARIOS.HORA_11_12;
    if (tiempo < 150) return CONFIG.HORARIOS.HORA_12_1330;
    if (tiempo < 215) return CONFIG.HORARIOS.HORA_1330_1435;
    return CONFIG.HORARIOS.HORA_1435_1520;
  },

  determinarTipoCliente: () => {
    return Math.random() < 0.2 ? 'LLEVAR' : 'LOCAL';
  },

  determinarSalon: () => {
    return Math.random() < 0.3 ? 'ROJO' : 'AZUL';
  },

  obtenerDatosClientes: () => {
    const { CLIENTES } = CONFIG;
    const horarioActual = simulacion.obtenerHorarioActual();
    const tipoCliente = simulacion.determinarTipoCliente();
    const salon = tipoCliente === 'LOCAL' ? simulacion.determinarSalon() : null;

    const tiempoPreparacion = tipoCliente === 'LLEVAR' 
      ? utilidades.obtenerNumeroAleatorio(CLIENTES.PREPARACION.LLEVAR.PROMEDIO, CLIENTES.PREPARACION.LLEVAR.VARIACION)
      : utilidades.obtenerNumeroAleatorio(CLIENTES.PREPARACION.LOCAL.PROMEDIO, CLIENTES.PREPARACION.LOCAL.VARIACION);

    const tiempoPermanencia = salon 
      ? utilidades.obtenerNumeroAleatorio(horarioActual[salon].PROMEDIO, horarioActual[salon].VARIACION)
      : 0;

    return {
      caja: utilidades.obtenerNumeroAleatorio(CLIENTES.CAJA.PROMEDIO, CLIENTES.CAJA.VARIACION),
      mostrador: utilidades.obtenerNumeroAleatorio(CLIENTES.MOSTRADOR.PROMEDIO, CLIENTES.MOSTRADOR.VARIACION),
      rojo: salon === 'ROJO' ? Math.min(utilidades.obtenerNumeroAleatorio(CLIENTES.ROJO.PROMEDIO, CLIENTES.ROJO.VARIACION), CLIENTES.ROJO.MAXIMO) : 0,
      azul: salon === 'AZUL' ? Math.min(utilidades.obtenerNumeroAleatorio(CLIENTES.AZUL.PROMEDIO, CLIENTES.AZUL.VARIACION), CLIENTES.AZUL.MAXIMO) : 0,
      tiempoNegocio: tiempoPermanencia,
      tipoCliente,
      tiempoPreparacion
    };
  },

  actualizarDatos: (datos) => {
    DOM.contadores.tiempoNegocio.innerText = `${datos.tiempoNegocio} min`;
    DOM.contadores.caja.innerText = datos.caja;
    DOM.contadores.mostrador.innerText = datos.mostrador;
    DOM.contadores.salonRojo.innerText = datos.rojo;
    DOM.contadores.salonAzul.innerText = datos.azul;

    visualizacion.posicionarClientes(datos);
  },

  avanzarTiempo: (minutos) => {
    estadoSimulacion.tiempo += minutos;
    const datos = simulacion.obtenerDatosClientes();
    simulacion.actualizarDatos(datos);
  },

  ejecutar: () => {
    estadoSimulacion.intervalo = setInterval(() => {
      estadoSimulacion.tiempo += 1;
      const datos = simulacion.obtenerDatosClientes();
      simulacion.actualizarDatos(datos);

      if (estadoSimulacion.tiempo >= CONFIG.TIEMPO_MAXIMO) {
        clearInterval(estadoSimulacion.intervalo);
        console.log("Simulación completada.");
        utilidades.mostrarAlerta();
      }
    }, CONFIG.INTERVALO_SIMULACION);
  },

  ejecutarInstantanea: () => {
    estadoSimulacion.tiempo = CONFIG.TIEMPO_MAXIMO;
    const datos = simulacion.obtenerDatosClientes();
    simulacion.actualizarDatos(datos);
    console.log("Simulación instantánea completada.");
    utilidades.mostrarAlerta();
  }
};

// Visualización
const visualizacion = {
  ctx: DOM.canvas.getContext("2d"),

  dibujarEscenario: () => {
    const { ctx } = visualizacion;
    ctx.fillStyle = "#FFFFFF";
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
    ctx.fillText("PARA LLEVAR", 50, 415);
  },

  posicionarClientes: (datos) => {
    const { ctx } = visualizacion;
    ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
    visualizacion.dibujarEscenario();
    
    const { caja, mostrador, rojo, azul, tipoCliente, tiempoPreparacion } = datos;
    
    // Clientes en caja
    ctx.fillStyle = "#000000";
    for (let i = 0; i < caja; i++) {
      ctx.fillRect(55 + (i % 5) * 20, 55 + Math.floor(i / 5) * 20, 10, 10);
    }

    // Clientes en mostrador
    for (let i = 0; i < mostrador; i++) {
      ctx.fillRect(185 + (i % 5) * 20, 55 + Math.floor(i / 5) * 20, 10, 10);
    }

    // Clientes en salón rojo
    ctx.fillStyle = "#000000";
    for (let i = 0; i < rojo; i++) {
      ctx.fillRect(350 + (i % 10) * 15, 140 + Math.floor(i / 10) * 15, 10, 10);
    }

    // Clientes en salón azul
    for (let i = 0; i < azul; i++) {
      ctx.fillRect(350 + (i % 10) * 15, 280 + Math.floor(i / 10) * 15, 10, 10);
    }

    // Clientes para llevar
    if (tipoCliente === 'LLEVAR') {
      ctx.fillRect(50, 425, 10, 10);
      ctx.font = "0.7rem Arial";
      ctx.fillText(`Tiempo prep: ${tiempoPreparacion}s`, 70, 430);
    }
  }
};

// Inicialización de eventos
DOM.botones.start.addEventListener("click", () => {
  DOM.botones.start.style.display = "none";
  DOM.botones.instant.style.display = "block";
  DOM.botones.restart.style.display = "block";
  document.getElementById("simulation").style.display = "block";
  simulacion.ejecutar();
});

DOM.botones.instant.addEventListener("click", () => {
  clearInterval(estadoSimulacion.intervalo);
  simulacion.ejecutarInstantanea();
});

DOM.botones.restart.addEventListener("click", () => {
  DOM.alertContainer.style.display = "none";
  location.reload();
});
