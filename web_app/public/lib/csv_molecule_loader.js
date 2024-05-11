import {
	FileLoader,
	Loader,
} from 'three';

class CSVLoader extends Loader {

	constructor( manager ) {

		super( manager );

	}

	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( scope.manager );
		loader.setPath( scope.path );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, function ( text ) {

			try {

				onLoad( scope.parse( text ) );

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );

			}

		}, onProgress, onError );

	}

	// Based on CanvasMol PDB parser

	parse( text ) {
		const atoms = [];
		const bonds = [];

		const lines = text.split( '\n' );
		for ( let i = 0; i < lines.length; i ++ ) {
			const atom_or_bond = lines[i].split(',');
			for (let i = 0; i<atom_or_bond.length; i++) {
				atom_or_bond[i] = atom_or_bond[i].trim();
				if (i === 3) {
					atom_or_bond[i] = atom_or_bond[i].toUpperCase();
				} else {
					atom_or_bond[i] = parseFloat(atom_or_bond[i]);
				}
			}
			// if the length is 3, it must be a bond. If it is 4, it is an atom
			if (atom_or_bond.length === 3) {
				// bond. First 2 numbers are the atom indices, and the 3rd is the number of bonds between them
				bonds.push({
					'atoms': atom_or_bond.slice(0,2),
					'count': parseInt(atom_or_bond[2]),
				});
			} else if (atom_or_bond.length === 4) {
				// atom. First 3 numbers are the x, y, z coordinates, and the 4th is the atom type
				atoms[i] = {
					'coordinates': atom_or_bond.slice(0,3),
					'element': atom_or_bond[3],
				};
			}
		}
		return {'atoms': atoms, 'bonds': bonds};
	}

}

export { CSVLoader };