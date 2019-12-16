import { Component, OnInit } from '@angular/core';
import { Lugar } from '../../interfaces/interfaces';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../../services/websocket.service';
import * as mapboxgl from 'mapbox-gl';

interface RespMarcadores {
  [key: string]: Lugar;
}

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit {

  mapa: mapboxgl.Map;
  // lugares: Lugar[] = [];
  lugares: RespMarcadores = {};
  markersMapbox: { [id: string]: mapboxgl.Marker } = {};

  constructor(
    private http: HttpClient,
    private wsService: WebsocketService
  ) { }

  ngOnInit() {
    this.http.get<RespMarcadores>('http://localhost:3000/mapa').subscribe( lugares => {
      // console.log(lugares);
      this.lugares = lugares;
      this.crearMapa();
    });
    this.escucharSockets();
  }

  escucharSockets() {

    // marcador-nuevo
    this.wsService.listen('marcador-nuevo').subscribe( (marcador: Lugar) => this.agregarMarcador(marcador) );

    // marcador-mover
    this.wsService.listen('marcador-mover').subscribe( (marcador: Lugar) => {
      this.markersMapbox[ marcador.id ].setLngLat([ marcador.lng, marcador.lat ]);
    });

    // marcador-borrar
    this.wsService.listen('marcador-borrar').subscribe( (id: string) => {
      this.markersMapbox[id].remove();
      delete this.markersMapbox[id];
    });

  }

  crearMapa() {

    (mapboxgl as any).accessToken = 'pk.eyJ1IjoiY2xhdWRpb3N0dWFyZG8iLCJhIjoiY2s0M2tobDdtMDJoNDNkbW11Mm5ncW4yZSJ9.Vc9Xbf2slbhY8kjv7uDjPw';

    this.mapa = new mapboxgl.Map({
      container: 'mapa',
      style: 'mapbox://styles/mapbox/streets-v11',
      // longitud, latitud
      center: [-70.57588927393569, -33.60960286549905],
      zoom: 15.8
    });

    for ( const [id, marcador] of Object.entries( this.lugares ) ) {
      this.agregarMarcador( marcador );
    }

  }

  agregarMarcador( marcador: Lugar ) {

    // Vanilla JavaScript
    const h2 = document.createElement('h2');
    h2.innerText = marcador.nombre;

    const btnBorrar = document.createElement('button');
    btnBorrar.innerText = 'Borrar';

    const div = document.createElement('div');
    div.append(h2, btnBorrar);

    // const html = `<h2>${ marcador.nombre }</h2>
    //               <br>
    //               <button>Borrar</button>`;

    const customPopup = new mapboxgl.Popup({
      offset: 25,
      closeOnClick: false
    }).setDOMContent( div );

    const marker = new mapboxgl.Marker({
      draggable: true,
      color: marcador.color
    })
    .setLngLat([marcador.lng, marcador.lat])
    .setPopup(customPopup)
    .addTo( this.mapa );

    marker.on('drag', () => {

      const lngLat = marker.getLngLat();
      // console.log(lngLat);

      // Crear evento para emitir las coordenadas de este marcador
      // marcador-mover
      const nuevoMarcador = {
        id: marcador.id,
        // destructuración del objeto
        ...lngLat
      };

      this.wsService.emit('marcador-mover', nuevoMarcador);

    });

    btnBorrar.addEventListener( 'click', () => {
      marker.remove();

      // Eliminar el marcador mediante sockets
      this.wsService.emit('marcador-borrar', marcador.id);

    });

    this.markersMapbox[ marcador.id ] = marker;

  }

  crearMarcador() {

    const customMarker: Lugar = {
      id: new Date().toISOString(),
      lng: -70.57588927393569,
      lat:  -33.60960286549905,
      nombre: 'Sin nombre',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    };

    this.agregarMarcador( customMarker );

    // emitir marcador-nuevo
    this.wsService.emit( 'marcador-nuevo', customMarker );

  }

}
