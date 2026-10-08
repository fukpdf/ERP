import type { Result } from '@erp/core';

export interface ICommand<_TResult = void> {
  readonly commandId?: string;
  readonly timestamp?: string;
}

export interface IQuery<_TResult = unknown> {
  readonly queryId?: string;
}

export interface ICommandHandler<TCommand extends ICommand<TResult>, TResult = void> {
  execute(command: TCommand): Promise<Result<TResult, Error>>;
}

export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult = unknown> {
  execute(query: TQuery): Promise<Result<TResult, Error>>;
}
