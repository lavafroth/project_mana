{
  description = "devshell";

  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            live-server
            superhtml
            (writeScriptBin "serve" ''
              ${pkgs.live-server}/bin/live-server --port 8000 --hard
            '')
          ];

        };
      }
    );
}
