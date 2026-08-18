-- Walking skeleton baseline: a single-row table the API health check reads,
-- proving that migrations ran against the database it is connected to.
create table app_info (
    only_row boolean primary key default true check (only_row),
    schema_version integer not null
);

insert into app_info (schema_version) values (1);
