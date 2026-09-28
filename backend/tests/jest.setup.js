process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// Force mongodb-memory-server to use x64 binary on ia32 Windows Node
process.env.MONGOMS_ARCH = 'x64';
process.env.MONGOMS_VERSION = '6.0.4';
