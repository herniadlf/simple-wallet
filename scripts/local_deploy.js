async function main() {
    const factory = await ethers.getContractFactory('SimpleWallet');
    const deployedInstance = await factory.deploy();
    await deployedInstance.deployed();

    console.log('SimpleWallet Contract address ' + deployedInstance.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
