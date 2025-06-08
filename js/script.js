document.getElementById("btn15min").addEventListener("click", function () {
  avanzarTiempo(15);
});

document.getElementById("btn30min").addEventListener("click", function () {
  avanzarTiempo(30);
});

function avanzarTiempo(minutos) {
  tiempoSimulacion += minutos;
  let cajaClientes = obtenerNumeroAleatorio(60, 30);
  let mostradorClientes = obtenerNumeroAleatorio(30, 15);
  let rojoClientes = Math.min(obtenerNumeroAleatorio(30, 10), 30);
  let azulClientes = Math.min(obtenerNumeroAleatorio(40, 10), 40);
  let tiempoNegocio = obtenerNumeroAleatorio(120, 30);

  actualizarDatos(
    tiempoNegocio,
    cajaClientes,
    mostradorClientes,
    rojoClientes,
    azulClientes
  );
}

const startBtn = document.getElementById("startBtn");
const instantBtn = document.getElementById("instantBtn");
const restartBtn = document.getElementById("restartBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let tiempoSimulacion = 0;
let intervalo;

function obtenerNumeroAleatorio(promedio, variacion) {
  return Math.round(promedio + (Math.random() * 2 - 1) * variacion);
}

function ejecutarSimulacion() {
  intervalo = setInterval(() => {
    tiempoSimulacion += 1;

    let cajaClientes = obtenerNumeroAleatorio(60, 30);
    let mostradorClientes = obtenerNumeroAleatorio(30, 15);
    let rojoClientes = Math.min(obtenerNumeroAleatorio(30, 10), 30);
    let azulClientes = Math.min(obtenerNumeroAleatorio(40, 10), 40);
    let tiempoNegocio = obtenerNumeroAleatorio(120, 30);

    actualizarDatos(
      tiempoNegocio,
      cajaClientes,
      mostradorClientes,
      rojoClientes,
      azulClientes
    );

    if (tiempoSimulacion >= 260) {
      clearInterval(intervalo);
      console.log("Simulación completada.");
      const alertContainer = document.getElementById("alertContainer");
      alertContainer.style.display = "block";
      alertContainer.style.opacity = "0";
      alertContainer.style.transform = "translateY(-20px)";
      alertContainer.style.transition = "all 0.3s ease-in-out";
      
      setTimeout(() => {
        alertContainer.style.opacity = "1";
        alertContainer.style.transform = "translateY(0)";
      }, 100);

      setTimeout(() => {
        alertContainer.style.opacity = "0";
        alertContainer.style.transform = "translateY(-20px)";
        setTimeout(() => {
          alertContainer.style.display = "none";
        }, 300);
      }, 5000);
    }
  }, 1000);
}

function ejecutarSimulacionInstantanea() {
  tiempoSimulacion = 260;
  let cajaClientesFinal = obtenerNumeroAleatorio(60, 30);
  let mostradorClientesFinal = obtenerNumeroAleatorio(30, 15);
  let rojoClientesFinal = Math.min(obtenerNumeroAleatorio(30, 10), 30);
  let azulClientesFinal = Math.min(obtenerNumeroAleatorio(40, 10), 40);
  let tiempoNegocioFinal = obtenerNumeroAleatorio(120, 30);

  actualizarDatos(
    tiempoNegocioFinal,
    cajaClientesFinal,
    mostradorClientesFinal,
    rojoClientesFinal,
    azulClientesFinal
  );
  console.log("Simulación instantánea completada.");
  
  const alertContainer = document.getElementById("alertContainer");
  alertContainer.style.display = "block";
  alertContainer.style.opacity = "0";
  alertContainer.style.transform = "translateY(-20px)";
  alertContainer.style.transition = "all 0.3s ease-in-out";
  
  setTimeout(() => {
    alertContainer.style.opacity = "1";
    alertContainer.style.transform = "translateY(0)";
  }, 100);

  setTimeout(() => {
    alertContainer.style.opacity = "0";
    alertContainer.style.transform = "translateY(-20px)";
    setTimeout(() => {
      alertContainer.style.display = "none";
    }, 300);
  }, 5000);
}

function actualizarDatos(
  tiempoNegocio,
  cajaClientes,
  mostradorClientes,
  rojoClientes,
  azulClientes
) {
  document.getElementById("tiempoNegocio").innerText = tiempoNegocio + " min";
  document.getElementById("cajaCount").innerText = cajaClientes;
  document.getElementById("mostradorCount").innerText = mostradorClientes;
  document.getElementById("salonRojoCount").innerText = rojoClientes;
  document.getElementById("salonAzulCount").innerText = azulClientes;

  posicionarClientesFinal(
    cajaClientes,
    mostradorClientes,
    rojoClientes,
    azulClientes
  );
}

function dibujarEscenario() {
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

startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  instantBtn.style.display = "block";
  restartBtn.style.display = "block";
  document.getElementById("simulation").style.display = "block";
  ejecutarSimulacion();
});

instantBtn.addEventListener("click", function() {
  clearInterval(intervalo);
  ejecutarSimulacionInstantanea();
});

restartBtn.addEventListener("click", () => {
  document.getElementById("alertContainer").style.display = "none";
  location.reload();
});
