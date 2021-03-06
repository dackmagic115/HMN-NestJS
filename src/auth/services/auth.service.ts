import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProps, User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

export interface IAuthService {
  insertEntry(props: UserProps): Promise<User>;
  authCreadential(props: UserProps): Promise<TokenPayload | null>;
}

export interface JwtPayload {
  username: string;
}

export interface TokenPayload {
  accessToken: string;
}

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @InjectRepository(UserRepository)
    private repo: UserRepository,
    private jwtService: JwtService,
  ) {}

  async insertEntry(props: UserProps): Promise<User> {
    const exist = await this.repo.findOne({ username: props.username });

    if (exist) throw new ForbiddenException(`username is existing`);

    const salt = await bcrypt.genSalt();

    props.password = await this.hashPassword(props.password, salt);
    return this.repo.insertEntry(props);
  }

  async authCreadential(props: UserProps): Promise<TokenPayload | null> {
    const user = await this.repo.findOne({ username: props.username });

    if (user && this.validatePassword(props.password, user.password)) {
      const payload: JwtPayload = { username: user.username };
      const accessToken = await this.jwtService.sign(payload);

      return { accessToken };
    } else {
      throw new UnauthorizedException('Invalid creadential');
    }
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    return bcrypt.hash(password, salt);
  }

  private async validatePassword(
    signInPassword: string,
    password: string,
  ): Promise<boolean> {
    const salt = await bcrypt.genSalt();
    const hash = await this.hashPassword(signInPassword, salt);
    return hash === password;
  }
}
