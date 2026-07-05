// Ambient declaration for the OPTIONAL native engine. node-llama-cpp (MIT) ships prebuilt with the packaged
// ORIRO app but is NOT a hard dependency of the source tree, so `tsc` must not fail when it is absent. The
// module is dynamically imported and used behind a narrow, hand-written surface (see engine.ts); declaring
// it here keeps type-checking green whether or not the native package is installed. When it IS installed,
// its own richer types are not needed — engine.ts is the single, reviewed boundary to the native API.
declare module "node-llama-cpp";
