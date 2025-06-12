document.addEventListener("DOMContentLoaded", () => {

    const CONFIG = {
        TIEMPO_MAXIMO_SIMULACION: 260 * 60, // 260 minutos
        INTERVALO_VISUALIZACION_MS: 1, // velocidad
        CANTIDAD_EMPLEADOS_MOSTRADOR: 3,

        LLEGADA_CLIENTES: {
            PROMEDIO: 60,
            VARIACION: 30
        },
        ATENCION_CAJA: {
            PROMEDIO: 30,
            VARIACION: 15
        },
        PREPARACION: {
            LOCAL: { PROMEDIO: 90, VARIACION: 10 },
            LLEVAR: { PROMEDIO: 120, VARIACION: 20 }
        },
        SALONES: {
            ROJO: { CAPACIDAD: 30 },
            AZUL: { CAPACIDAD: 40 }
        },
        PERMANENCIA: {
            // 11:00 a 12:00 (0 a 3600s)
            FRANJA_1: {
                MIN: 0,
                MAX: 60 * 60,
                ROJO: { PROMEDIO: 20 * 60, VARIACION: 15 * 60 },
                AZUL: { PROMEDIO: 30 * 60, VARIACION: 10 * 60 }
            },
            // 12:00 a 13:30 (3600 a 9000s)
            FRANJA_2: {
                MIN: 60 * 60,
                MAX: 90 * 60,
                ROJO: { PROMEDIO: 30 * 60, VARIACION: 15 * 60 },
                AZUL: { PROMEDIO: 40 * 60, VARIACION: 10 * 60 }
            },
            // 13:30 a 14:35 (9000 a 14100s)
            FRANJA_3: {
                MIN: 90 * 60,
                MAX: (2 * 60 + 35) * 60,
                ROJO: { PROMEDIO: 35 * 60, VARIACION: 15 * 60 },
                AZUL: { PROMEDIO: 45 * 60, VARIACION: 10 * 60 }
            },
            // 14:35 a 15:20
            FRANJA_4: {
                MIN: (2 * 60 + 35) * 60,
                MAX: (4 * 60 + 20) * 60,
                ROJO: { PROMEDIO: 20 * 60, VARIACION: 15 * 60 },
                AZUL: { PROMEDIO: 35 * 60, VARIACION: 10 * 60 }
            }
        },
        PROBABILIDADES: {
            LLEVAR: 0.20,
            SALON_ROJO: 0.30 // El resto (0.70) va al azul.
        },
        // Intervalos para la recolección de estadísticas (en segundos)
        INTERVALO_REPORTE_MOSTRADOR: 15 * 60,
        INTERVALO_REPORTE_SALONES: 30 * 60,
    };


    const DOM = {
        botones: {
            start: document.getElementById("startBtn"),
            instant: document.getElementById("instantBtn"),
            restart: document.getElementById("restartBtn")
        },
        canvas: document.getElementById("canvas"),
        ctx: document.getElementById("canvas").getContext("2d"),
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


    let simState = {};

    function resetSimState() {
        simState = {
            tiempoActual: 0,
            proximaLlegadaCliente: 0,
            proximoReporteMostrador: 0,
            proximoReporteSalones: 0,
            intervaloId: null,
            simulacionTerminada: false,

            // Representación de los recursos del sistema
            caja: {
                ocupada: false,
                clienteId: null,
                libreEn: 0
            },
            mostrador: Array.from({ length: CONFIG.CANTIDAD_EMPLEADOS_MOSTRADOR }, () => ({
                ocupado: false,
                clienteId: null,
                libreEn: 0
            })),

            // Colas y listas de clientes
            clientes: new Map(), // Almacena todos los clientes por idd
            colaCaja: [],
            colaMostrador: [],
            enSalonRojo: [],
            enSalonAzul: [],

            // Estadistocas
            stats: {
                totalClientesFinalizados: 0,
                tiempoTotalEnNegocio: 0,
                tiempoTotalEnColaCaja: 0
            }
        };
    }


    // CLASE CLIENTE
    class Cliente {
        static nextId = 1;
        constructor(tiempoLlegada) {
            this.id = Cliente.nextId++;
            this.llegadaTime = tiempoLlegada;
            this.tipo = Math.random() < CONFIG.PROBABILIDADES.LLEVAR ? 'LLEVAR' : 'LOCAL';
            this.destinoSalon = 'NINGUNO';

            if (this.tipo === 'LOCAL') {
                this.destinoSalon = Math.random() < CONFIG.PROBABILIDADES.SALON_ROJO ? 'ROJO' : 'AZUL';
            }

            // Tiempos que se calcularán durante la simulación
            this.inicioAtencionCajaTime = 0;
            this.finAtencionCajaTime = 0;
            this.finPreparacionTime = 0;
            this.salidaTime = 0;
        }
    }

    // FUNCIONES DE UTILIDAD
    const utils = {

        tiempoAleatorio: (promedio, variacion) => {
            const valor = promedio + (Math.random() * 2 - 1) * variacion;
            return Math.max(0, valor);
        },

        formatearHora: (segundos) => {
            const minutosTotales = Math.floor(segundos / 60);
            const hora = Math.floor(minutosTotales / 60) + 11;
            const min = minutosTotales % 60;
            return `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        },

        getPermanenciaConfig: (tiempoActual) => {
            for (const franja in CONFIG.PERMANENCIA) {
                const f = CONFIG.PERMANENCIA[franja];
                if (tiempoActual >= f.MIN && tiempoActual < f.MAX) {
                    return f;
                }
            }
            return CONFIG.PERMANENCIA.FRANJA_4; 
        }
    };

    //  CANVAS
    const visualizacion = {
        dibujarEscenario: () => {
            const { ctx } = DOM;
            ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
            ctx.fillStyle = "#f0f0f0";
            ctx.fillRect(0, 0, DOM.canvas.width, DOM.canvas.height);

            /
            ctx.strokeStyle = "#cccccc";
            ctx.lineWidth = 1;

            ctx.strokeRect(20, 350, 100, 50);
            ctx.fillStyle = "black";
            ctx.font = "12px Arial";
            ctx.fillText("Entrada", 45, 380);

            ctx.strokeRect(20, 20, 150, 100);
            ctx.fillText("Caja", 75, 15);
            
            ctx.strokeRect(200, 20, 150, 100);
            ctx.fillText("Mostrador", 240, 15);

            ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
            ctx.fillRect(380, 20, 200, 180);
            ctx.strokeRect(380, 20, 200, 180);
            ctx.fillStyle = "black";
            ctx.fillText(`Salón Rojo (${simState.enSalonRojo.length}/${CONFIG.SALONES.ROJO.CAPACIDAD})`, 420, 15);

            ctx.fillStyle = "rgba(0, 0, 255, 0.1)";
            ctx.fillRect(380, 220, 200, 180);
            ctx.strokeRect(380, 220, 200, 180);
            ctx.fillStyle = "black";
            ctx.fillText(`Salón Azul (${simState.enSalonAzul.length}/${CONFIG.SALONES.AZUL.CAPACIDAD})`, 420, 215);
        },

        dibujarClientes: () => {
            const { ctx } = DOM;
            
            // Cola caja
            ctx.fillStyle = "orange";
            simState.colaCaja.forEach((id, i) => {
                ctx.fillRect(30 + (i % 7) * 15, 40 + Math.floor(i / 7) * 15, 10, 10);
            });
            
            // ciente en Caja
            if(simState.caja.ocupada){
                 ctx.fillStyle = "green";
                 ctx.fillRect(80, 90, 12, 12);
            }

            // cola mostrador
            ctx.fillStyle = "purple";
            simState.colaMostrador.forEach((id, i) => {
                 ctx.fillRect(210 + (i % 7) * 15, 40 + Math.floor(i / 7) * 15, 10, 10);
            });

            // clientes mostrador
            simState.mostrador.forEach((empleado, i) => {
                if(empleado.ocupado) {
                    ctx.fillStyle = "green";
                    ctx.fillRect(210 + i * 40, 90, 12, 12);
                }
            });

            // cientes en salon Rojo
            ctx.fillStyle = "red";
            simState.enSalonRojo.forEach((id, i) => {
                 ctx.fillRect(390 + (i % 12) * 15, 40 + Math.floor(i / 12) * 15, 10, 10);
            });
            
            // clientes en Salon Azul
            ctx.fillStyle = "blue";
            simState.enSalonAzul.forEach((id, i) => {
                 ctx.fillRect(390 + (i % 12) * 15, 240 + Math.floor(i / 12) * 15, 10, 10);
            });
        },

        actualizarTodo: () => {
            visualizacion.dibujarEscenario();
            visualizacion.dibujarClientes();
        }
    };


    // la logica d ela simulacion
    const simulador = {
        // un tick por segundo
        tick: () => {
            const t = simState.tiempoActual;

            // evento 1: llegado del cliente
            if (t >= simState.proximaLlegadaCliente && t < CONFIG.TIEMPO_MAXIMO_SIMULACION) {
                const nuevoCliente = new Cliente(t);
                simState.clientes.set(nuevoCliente.id, nuevoCliente);
                simState.colaCaja.push(nuevoCliente.id);
                
                // Programar la proxima llegada
                const tiempoProximaLlegada = utils.tiempoAleatorio(CONFIG.LLEGADA_CLIENTES.PROMEDIO, CONFIG.LLEGADA_CLIENTES.VARIACION);
                simState.proximaLlegadaCliente = t + tiempoProximaLlegada;
            }

            // 2. proceso de atencion en caja
            // Si la caja esta libre y hay alguien en la cola
            if (!simState.caja.ocupada && simState.colaCaja.length > 0) {
                const clienteId = simState.colaCaja.shift();
                const cliente = simState.clientes.get(clienteId);
                
                simState.caja.ocupada = true;
                simState.caja.clienteId = clienteId;
                
                const tiempoAtencion = utils.tiempoAleatorio(CONFIG.ATENCION_CAJA.PROMEDIO, CONFIG.ATENCION_CAJA.VARIACION);
                simState.caja.libreEn = t + tiempoAtencion;
                
                cliente.inicioAtencionCajaTime = t;
                cliente.finAtencionCajaTime = t + tiempoAtencion;

                // Calcular estadistica de tiempo en cola
                const tiempoEnCola = cliente.inicioAtencionCajaTime - cliente.llegadaTime;
                simState.stats.tiempoTotalEnColaCaja += tiempoEnCola;
            }

            // 3. EVENTO: CLIENTE TERMINA EN CAJA
            if (simState.caja.ocupada && t >= simState.caja.libreEn) {
                const clienteId = simState.caja.clienteId;
                simState.colaMostrador.push(clienteId);

                // Liberar la caja
                simState.caja.ocupada = false;
                simState.caja.clienteId = null;
            }

            // 4. PROCESO: PREPARACIN DE PEDIDO EN MOSTRADOR
            // Buscar un empleado libre
            const empleadoLibreIdx = simState.mostrador.findIndex(e => !e.ocupado);
            if (empleadoLibreIdx !== -1 && simState.colaMostrador.length > 0) {
                const clienteId = simState.colaMostrador.shift();
                const cliente = simState.clientes.get(clienteId);
                
                // Asignar al empleado
                simState.mostrador[empleadoLibreIdx].ocupado = true;
                simState.mostrador[empleadoLibreIdx].clienteId = clienteId;

                const configPrep = cliente.tipo === 'LOCAL' ? CONFIG.PREPARACION.LOCAL : CONFIG.PREPARACION.LLEVAR;
                const tiempoPreparacion = utils.tiempoAleatorio(configPrep.PROMEDIO, configPrep.VARIACION);

                simState.mostrador[empleadoLibreIdx].libreEn = t + tiempoPreparacion;
                cliente.finPreparacionTime = t + tiempoPreparacion;
            }

            // 5. EVENTO: PEDIDO LISTO EN MOSTRADOR
            simState.mostrador.forEach((empleado, idx) => {
                if (empleado.ocupado && t >= empleado.libreEn) {
                    const clienteId = empleado.clienteId;
                    const cliente = simState.clientes.get(clienteId);

                    if (cliente.tipo === 'LLEVAR') {
                        // El cliente se va
                        cliente.salidaTime = t;
                        simState.stats.totalClientesFinalizados++;
                        simState.stats.tiempoTotalEnNegocio += (cliente.salidaTime - cliente.llegadaTime);
                    } else {
                        // El cliente intenta ir a un salón
                        const salonDestino = cliente.destinoSalon === 'ROJO' ? simState.enSalonRojo : simState.enSalonAzul;
                        const capacidadSalon = cliente.destinoSalon === 'ROJO' ? CONFIG.SALONES.ROJO.CAPACIDAD : CONFIG.SALONES.AZUL.CAPACIDAD;

                        if (salonDestino.length < capacidadSalon) {
                            salonDestino.push(clienteId);
                            const configPermanencia = utils.getPermanenciaConfig(t);
                            const permanencia = cliente.destinoSalon === 'ROJO' 
                                ? utils.tiempoAleatorio(configPermanencia.ROJO.PROMEDIO, configPermanencia.ROJO.VARIACION)
                                : utils.tiempoAleatorio(configPermanencia.AZUL.PROMEDIO, configPermanencia.AZUL.VARIACION);
                            cliente.salidaTime = t + permanencia;
                        } else {
                            // Salón lleno, el cliente se va (según interpretación del enunciado)
                            cliente.salidaTime = t;
                            simState.stats.totalClientesFinalizados++;
                            simState.stats.tiempoTotalEnNegocio += (cliente.salidaTime - cliente.llegadaTime);
                        }
                    }
                    // Liberar al empleado
                    empleado.ocupado = false;
                    empleado.clienteId = null;
                }
            });
            
            // 6. EVENTO: CLIENTES SALEN DE LOS SALONES
            const checkSalidaSalon = (salonArray) => {
                 const clientesQueSeQuedan = [];
                 salonArray.forEach(clienteId => {
                     const cliente = simState.clientes.get(clienteId);
                     if(t >= cliente.salidaTime) {
                         simState.stats.totalClientesFinalizados++;
                         simState.stats.tiempoTotalEnNegocio += (cliente.salidaTime - cliente.llegadaTime);
                     } else {
                         clientesQueSeQuedan.push(clienteId);
                     }
                 });
                 return clientesQueSeQuedan;
            };
            simState.enSalonRojo = checkSalidaSalon(simState.enSalonRojo);
            simState.enSalonAzul = checkSalidaSalon(simState.enSalonAzul);


            // 7. ESTADISTICAS POR INTERVALO
            if (t >= simState.proximoReporteMostrador) {
                const row = DOM.tablas.mostrador.insertRow();
                row.insertCell(0).textContent = utils.formatearHora(t);
                row.insertCell(1).textContent = simState.colaMostrador.length;
                simState.proximoReporteMostrador += CONFIG.INTERVALO_REPORTE_MOSTRADOR;
            }

            if (t >= simState.proximoReporteSalones) {
                const row = DOM.tablas.salones.insertRow();
                row.insertCell(0).textContent = utils.formatearHora(t);
                row.insertCell(1).textContent = simState.enSalonRojo.length;
                row.insertCell(2).textContent = simState.enSalonAzul.length;
                simState.proximoReporteSalones += CONFIG.INTERVALO_REPORTE_SALONES;
            }

            // 8. AVANZAR EL TIEMPO
            simState.tiempoActual++;
        },

        // Actualiza la interfaz de usuario con los datos actuales
        actualizarUI: () => {
            DOM.contadores.tiempoActual.innerText = utils.formatearHora(simState.tiempoActual);
            
            // Cantidad de gente en la cola + siendo atendido
            DOM.contadores.caja.innerText = simState.colaCaja.length + (simState.caja.ocupada ? 1 : 0);
            DOM.contadores.mostrador.innerText = simState.colaMostrador.length + simState.mostrador.filter(e => e.ocupado).length;
            DOM.contadores.salonRojo.innerText = simState.enSalonRojo.length;
            DOM.contadores.salonAzul.innerText = simState.enSalonAzul.length;

            const { stats } = simState;
            if (stats.totalClientesFinalizados > 0) {
                const promedioNegocio = stats.tiempoTotalEnNegocio / stats.totalClientesFinalizados;
                DOM.contadores.promedioTiempoNegocio.innerText = `${Math.round(promedioNegocio / 60)} min`;

                const promedioCaja = stats.tiempoTotalEnColaCaja / stats.totalClientesFinalizados; // O por clientes que pasaron por caja
                DOM.contadores.promedioTiempoCaja.innerText = `${Math.round(promedioCaja / 60)} min`;
            }
        },

        // Bucle principal
        iniciarSimulacionVisual: () => {
            if (simState.intervaloId) clearInterval(simState.intervaloId);
            simState.intervaloId = setInterval(() => {
                simulador.tick();
                simulador.actualizarUI();
                visualizacion.actualizarTodo();
                
                if (simState.tiempoActual > CONFIG.TIEMPO_MAXIMO_SIMULACION) {
                    simulador.detenerSimulacion();
                }
            }, CONFIG.INTERVALO_VISUALIZACION_MS);
        },

        // Ejecuta toda la simulacion de una
        iniciarSimulacionInstantanea: () => {
            if (simState.intervaloId) clearInterval(simState.intervaloId);
            
            while(simState.tiempoActual <= CONFIG.TIEMPO_MAXIMO_SIMULACION) {
                simulador.tick();
            }
            simulador.actualizarUI();
            visualizacion.actualizarTodo();
            simulador.detenerSimulacion();
        },

        detenerSimulacion: () => {
             if (simState.intervaloId) clearInterval(simState.intervaloId);
             simState.simulacionTerminada = true;
             console.log("Simulación finalizada.");
             console.log("Estado final:", simState);
             
             // Mostrar alerta
             DOM.alertContainer.style.display = 'block';
             setTimeout(() => { DOM.alertContainer.style.display = 'none'; }, 5000);
        },
        
        limpiarUI: () => {
            DOM.tablas.mostrador.innerHTML = '';
            DOM.tablas.salones.innerHTML = '';
            DOM.contadores.promedioTiempoNegocio.innerText = '0 min';
            DOM.contadores.promedioTiempoCaja.innerText = '0 min';
            DOM.contadores.tiempoActual.innerText = '11:00';
        }
    };

    // botones
    DOM.botones.start.addEventListener("click", () => {
        DOM.botones.start.style.display = "none";
        DOM.botones.instant.style.display = "inline-block";
        DOM.botones.restart.style.display = "inline-block";
        
        resetSimState();
        simulador.limpiarUI();
        visualizacion.actualizarTodo();
        simulador.iniciarSimulacionVisual();
    });

    DOM.botones.instant.addEventListener("click", () => {
        simulador.iniciarSimulacionInstantanea();
    });

    DOM.botones.restart.addEventListener("click", () => {
        if(simState.intervaloId) clearInterval(simState.intervaloId);
        
        DOM.botones.start.style.display = "inline-block";
        DOM.botones.instant.style.display = "none";
        DOM.botones.restart.style.display = "none";
        
        resetSimState();
        simulador.limpiarUI();
        simulador.actualizarUI();
        visualizacion.actualizarTodo();
    });
    
    resetSimState();
    simulador.actualizarUI();
    visualizacion.actualizarTodo();
});
