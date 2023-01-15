import { Config, NodeSSH } from 'node-ssh'
import { ClientChannel, SFTPWrapper } from 'ssh2';


class EZssh {

    private client;
    private config;
    private shell: ClientChannel | null = null;
    private sftp: SFTPWrapper | null = null

    constructor(config: Config) {
        this.config = config
        this.client = new NodeSSH()
    }

    public async connect() {
        await this.client.connect(this.config)
    }

    public isConnected() {
        return this.client.isConnected()
    }



    public async openShell(callback: (arg0: string) => void) {
        this.shell?.close()
        this.shell = await this.client.requestShell()
        this.shell.on("data", (data: Buffer) => {
            callback(data.toString())
        })
        this.shell.on("exit", (code: string) => {
            callback("\nExit: " + code)
        })
        this.shell.stderr.on("data", (data: Buffer) => {
            callback("\nError: " + data.toString())
        })
        return this
    }

    public async exitShell() {
        if (!this.shell) return false
        this.shell.close()
    }

    public async writeCommand(command: string) {
        if (!this.shell) return false
        this.shell.write(command)
    }


    public async openSftp() {
        // this.sftp?.close()
        this.sftp = await this.client.requestSFTP()

    }
}


export default EZssh