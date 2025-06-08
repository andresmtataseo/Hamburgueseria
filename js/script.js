// Configuracion general del programa
const CONFIG = {
    TIEMPO_MAXIMO: 260, // Duracion total de la simulacion en minutos
    INTERVALO_SIMULACION: 50, // Intervalo entre actualizaciones en milisegundos
    ALERTA_DURACION: 5000, // Duracion de la alerta en milisegundos
    
    // Configuracion de tiempos para diferentes areas
    CLIENTES: {
        CAJA: { 
            PROMEDIO: 60, // Tiempo promedio en caja
            VARIACION: 30 // Variacion permitida
        },
        MOSTRADOR: { 
            PROMEDIO: 30, // Tiempo promedio en mostrador
            VARIACION: 15 
        },
        ROJO: { 
            PROMEDIO: 30, // Tiempo promedio en salon rojo
            VARIACION: 10, 
            MAXIMO: 30 // Maximo de clientes permitidos
        },
        AZUL: { 
            PROMEDIO: 40, // Tiempo promedio en salon azul
            VARIACION: 10, 
            MAXIMO: 40 
        },
        PREPARACION: {
            LOCAL: { 
                PROMEDIO: 90, // Tiempo promedio de preparacion para local
                VARIACION: 10 
            },
            LLEVAR: { 
                PROMEDIO: 120, // Tiempo promedio de preparacion para llevar
                VARIACION: 20 
            }
        }
    },
    
    // Configuracion de horarios y flujo de clientes
    HORARIOS: {
        HORA_11_12: { 
            ROJO: { PROMEDIO: 20, VARIACION: 15 }, 
            AZUL: { PROMEDIO: 30, VARIACION: 10 } 
        },
        HORA_12_1330: { 
            ROJO: { PROMEDIO: 30, VARIACION: 15 }, 
            AZUL: { PROMEDIO: 40, VARIACION: 10 } 
        },
        HORA_1330_1435: { 
            ROJO: { PROMEDIO: 35, VARIACION: 15 }, 
            AZUL: { PROMEDIO: 45, VARIACION: 10 } 
        },
        HORA_1435_1520: { 
            ROJO: { PROMEDIO: 20, VARIACION: 15 }, 
            AZUL: { PROMEDIO: 35, VARIACION: 10 } 
        }
    }
};

// Referencias a elementos del DOM
const DOM = {
    botones: {
        start: document.getElementById("startBtn"),
        instant: document.getElementById("instantBtn"),
        restart: document.getElementById("restartBtn")
    },
    canvas: document.getElementById("canvas"),
    alertContainer: document.getElementById("alertContainer"),
    contadores: {
        tiempoActual: document.getElementById("tiempoActual"),
        caja: document.getElementById("cajaCount"),
        mostrador: document.getElementById("mostradorCount"),
        salonRojo: document.getElementById("salonRojoCount"),
        salonAzul: document.getElementById("salonAzulCount"),
        promedioTiempoNegocio: document.getElementById("promedioTiempoNegocio"),
        promedioTiempoCaja: document.getElementById("promedioTiempoCaja")
    },
    tablas: {
        mostrador: document.getElementById("tablaMostrador").getElementsByTagName("tbody")[0],
        salones: document.getElementById("tablaSalones").getElementsByTagName("tbody")[0]
    }
};

// Estado actual de la simulacion
const estadoSimulacion = {
    tiempo: 0,
    intervalo: null,
    estadisticas: {
        tiempoTotalNegocio: 0,
        tiempoTotalCaja: 0,
        clientesAtendidos: 0,
        registroMostrador: [],
        registroSalones: []
    }
};

// Funciones de utilidad
const utilidades = {
    // Genera un numero aleatorio basado en promedio y variacion
    obtenerNumeroAleatorio: (promedio, variacion) => {
        return Math.round(promedio + (Math.random() * 2 - 1) * variacion);
    },

    // Muestra una alerta con animacion
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
    },

    // Convierte minutos a formato de hora
    formatearHora: (minutos) => {
        const hora = Math.floor(minutos / 60) + 11;
        const min = minutos % 60;
        return `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    },

    // Actualiza las estadisticas y tablas
    actualizarEstadisticas: (datos) => {
        estadoSimulacion.estadisticas.tiempoTotalNegocio += datos.tiempoNegocio;
        estadoSimulacion.estadisticas.tiempoTotalCaja += datos.caja;
        estadoSimulacion.estadisticas.clientesAtendidos++;

        const promedioNegocio = Math.round(
            estadoSimulacion.estadisticas.tiempoTotalNegocio / 
            estadoSimulacion.estadisticas.clientesAtendidos
        );
        const promedioCaja = Math.round(
            estadoSimulacion.estadisticas.tiempoTotalCaja / 
            estadoSimulacion.estadisticas.clientesAtendidos
        );

        DOM.contadores.promedioTiempoNegocio.innerText = `${promedioNegocio} min`;
        DOM.contadores.promedioTiempoCaja.innerText = `${promedioCaja} min`;

        // Actualiza tabla de mostrador cada 15 minutos
        if (estadoSimulacion.tiempo % 15 === 0) {
            estadoSimulacion.estadisticas.registroMostrador.push({
                hora: utilidades.formatearHora(estadoSimulacion.tiempo),
                cantidad: datos.mostrador
            });
            
            const row = DOM.tablas.mostrador.insertRow();
            row.insertCell(0).textContent = utilidades.formatearHora(estadoSimulacion.tiempo);
            row.insertCell(1).textContent = datos.mostrador;
        }

        // Actualiza tabla de salones cada 30 minutos
        if (estadoSimulacion.tiempo % 30 === 0) {
            estadoSimulacion.estadisticas.registroSalones.push({
                hora: utilidades.formatearHora(estadoSimulacion.tiempo),
                rojo: datos.rojo,
                azul: datos.azul
            });
            
            const row = DOM.tablas.salones.insertRow();
            row.insertCell(0).textContent = utilidades.formatearHora(estadoSimulacion.tiempo);
            row.insertCell(1).textContent = datos.rojo;
            row.insertCell(2).textContent = datos.azul;
        }
    }
};

// Logica principal de la simulacion
const simulacion = {
    // Determina el horario actual basado en el tiempo
    obtenerHorarioActual: () => {
        const tiempo = estadoSimulacion.tiempo;
        if (tiempo < 60) return CONFIG.HORARIOS.HORA_11_12;
        if (tiempo < 150) return CONFIG.HORARIOS.HORA_12_1330;
        if (tiempo < 215) return CONFIG.HORARIOS.HORA_1330_1435;
        return CONFIG.HORARIOS.HORA_1435_1520;
    },

    // Determina si el cliente es para llevar o local
    determinarTipoCliente: () => {
        return Math.random() < 0.2 ? 'LLEVAR' : 'LOCAL';
    },

    // Determina a que salon va el cliente
    determinarSalon: () => {
        return Math.random() < 0.3 ? 'ROJO' : 'AZUL';
    },

    // Obtiene los datos de los clientes para el momento actual
    obtenerDatosClientes: () => {
        const { CLIENTES } = CONFIG;
        const horarioActual = simulacion.obtenerHorarioActual();
        const tipoCliente = simulacion.determinarTipoCliente();
        
        const vaAlRojo = tipoCliente === 'LOCAL' && Math.random() < 0.7;
        const vaAlAzul = tipoCliente === 'LOCAL' && Math.random() < 0.9;

        const tiempoPreparacion = tipoCliente === 'LLEVAR' 
            ? utilidades.obtenerNumeroAleatorio(
                CLIENTES.PREPARACION.LLEVAR.PROMEDIO, 
                CLIENTES.PREPARACION.LLEVAR.VARIACION
            )
            : utilidades.obtenerNumeroAleatorio(
                CLIENTES.PREPARACION.LOCAL.PROMEDIO, 
                CLIENTES.PREPARACION.LOCAL.VARIACION
            );

        let tiempoPermanencia = 0;
        if (vaAlRojo) {
            tiempoPermanencia += utilidades.obtenerNumeroAleatorio(
                horarioActual.ROJO.PROMEDIO, 
                horarioActual.ROJO.VARIACION
            );
        }
        if (vaAlAzul) {
            tiempoPermanencia += utilidades.obtenerNumeroAleatorio(
                horarioActual.AZUL.PROMEDIO, 
                horarioActual.AZUL.VARIACION
            );
        }

        return {
            caja: utilidades.obtenerNumeroAleatorio(CLIENTES.CAJA.PROMEDIO, CLIENTES.CAJA.VARIACION),
            mostrador: utilidades.obtenerNumeroAleatorio(CLIENTES.MOSTRADOR.PROMEDIO, CLIENTES.MOSTRADOR.VARIACION),
            rojo: vaAlRojo ? Math.min(
                utilidades.obtenerNumeroAleatorio(CLIENTES.ROJO.PROMEDIO, CLIENTES.ROJO.VARIACION), 
                CLIENTES.ROJO.MAXIMO
            ) : 0,
            azul: vaAlAzul ? Math.min(
                utilidades.obtenerNumeroAleatorio(CLIENTES.AZUL.PROMEDIO, CLIENTES.AZUL.VARIACION), 
                CLIENTES.AZUL.MAXIMO
            ) : 0,
            tiempoNegocio: tiempoPermanencia,
            tipoCliente,
            tiempoPreparacion
        };
    },

    // Actualiza los datos en la interfaz
    actualizarDatos: (datos) => {
        DOM.contadores.tiempoActual.innerText = utilidades.formatearHora(estadoSimulacion.tiempo);
        DOM.contadores.caja.innerText = datos.caja;
        DOM.contadores.mostrador.innerText = datos.mostrador;
        DOM.contadores.salonRojo.innerText = datos.rojo;
        DOM.contadores.salonAzul.innerText = datos.azul;

        utilidades.actualizarEstadisticas(datos);
        visualizacion.posicionarClientes(datos);
    },

    // Ejecuta la simulacion en tiempo real
    ejecutar: () => {
        estadoSimulacion.estadisticas = {
            tiempoTotalNegocio: 0,
            tiempoTotalCaja: 0,
            clientesAtendidos: 0,
            registroMostrador: [],
            registroSalones: []
        };
        
        DOM.tablas.mostrador.innerHTML = '';
        DOM.tablas.salones.innerHTML = '';
        DOM.contadores.tiempoActual.innerText = "11:00";

        estadoSimulacion.intervalo = setInterval(() => {
            estadoSimulacion.tiempo += 1;
            const datos = simulacion.obtenerDatosClientes();
            simulacion.actualizarDatos(datos);

            if (estadoSimulacion.tiempo >= CONFIG.TIEMPO_MAXIMO) {
                clearInterval(estadoSimulacion.intervalo);
                console.log("Simulacion completada.");
                utilidades.mostrarAlerta();
            }
        }, CONFIG.INTERVALO_SIMULACION);
    },

    // Ejecuta la simulacion instantaneamente
    ejecutarInstantanea: () => {
        estadoSimulacion.estadisticas = {
            tiempoTotalNegocio: 0,
            tiempoTotalCaja: 0,
            clientesAtendidos: 0,
            registroMostrador: [],
            registroSalones: []
        };
        
        DOM.tablas.mostrador.innerHTML = '';
        DOM.tablas.salones.innerHTML = '';
        DOM.contadores.tiempoActual.innerText = "11:00";

        for (let tiempo = 0; tiempo <= CONFIG.TIEMPO_MAXIMO; tiempo++) {
            estadoSimulacion.tiempo = tiempo;
            const datos = simulacion.obtenerDatosClientes();
            
            estadoSimulacion.estadisticas.tiempoTotalNegocio += datos.tiempoNegocio;
            estadoSimulacion.estadisticas.tiempoTotalCaja += datos.caja;
            estadoSimulacion.estadisticas.clientesAtendidos++;

            if (tiempo % 15 === 0) {
                estadoSimulacion.estadisticas.registroMostrador.push({
                    hora: utilidades.formatearHora(tiempo),
                    cantidad: datos.mostrador
                });
                
                const row = DOM.tablas.mostrador.insertRow();
                row.insertCell(0).textContent = utilidades.formatearHora(tiempo);
                row.insertCell(1).textContent = datos.mostrador;
            }

            if (tiempo % 30 === 0) {
                estadoSimulacion.estadisticas.registroSalones.push({
                    hora: utilidades.formatearHora(tiempo),
                    rojo: datos.rojo,
                    azul: datos.azul
                });
                
                const row = DOM.tablas.salones.insertRow();
                row.insertCell(0).textContent = utilidades.formatearHora(tiempo);
                row.insertCell(1).textContent = datos.rojo;
                row.insertCell(2).textContent = datos.azul;
            }
        }

        const promedioNegocio = Math.round(
            estadoSimulacion.estadisticas.tiempoTotalNegocio / 
            estadoSimulacion.estadisticas.clientesAtendidos
        );
        const promedioCaja = Math.round(
            estadoSimulacion.estadisticas.tiempoTotalCaja / 
            estadoSimulacion.estadisticas.clientesAtendidos
        );

        DOM.contadores.promedioTiempoNegocio.innerText = `${promedioNegocio} min`;
        DOM.contadores.promedioTiempoCaja.innerText = `${promedioCaja} min`;

        const datosFinales = simulacion.obtenerDatosClientes();
        simulacion.actualizarDatos(datosFinales);
        
        console.log("Simulacion instantanea completada.");
        utilidades.mostrarAlerta();
    }
};

// Visualizacion del escenario
const visualizacion = {
    ctx: DOM.canvas.getContext("2d"),

    // Dibuja el escenario base
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
        ctx.fillText("SALON ROJO", 400, 115);
        ctx.fillText("SALON AZUL", 400, 245);
        ctx.fillText("ENTRADA", 50, 395);
        ctx.fillText("PARA LLEVAR", 50, 415);
    },

    // Posiciona los clientes en el escenario
    posicionarClientes: (datos) => {
        const { ctx } = visualizacion;
        ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
        visualizacion.dibujarEscenario();
        
        const { caja, mostrador, rojo, azul, tipoCliente, tiempoPreparacion } = datos;
        
        ctx.fillStyle = "#000000";
        for (let i = 0; i < caja; i++) {
            ctx.fillRect(55 + (i % 5) * 20, 55 + Math.floor(i / 5) * 20, 10, 10);
        }

        for (let i = 0; i < mostrador; i++) {
            ctx.fillRect(185 + (i % 5) * 20, 55 + Math.floor(i / 5) * 20, 10, 10);
        }

        ctx.fillStyle = "#000000";
        for (let i = 0; i < rojo; i++) {
            ctx.fillRect(350 + (i % 10) * 15, 140 + Math.floor(i / 10) * 15, 10, 10);
        }

        for (let i = 0; i < azul; i++) {
            ctx.fillRect(350 + (i % 10) * 15, 280 + Math.floor(i / 10) * 15, 10, 10);
        }

        if (tipoCliente === 'LLEVAR') {
            ctx.fillRect(50, 425, 10, 10);
            ctx.font = "0.7rem Arial";
            ctx.fillText(`Tiempo prep: ${tiempoPreparacion}s`, 70, 430);
        }
    }
};

// Event listeners para los botones
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