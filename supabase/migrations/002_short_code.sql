alter table customers
  add column short_code char(6) unique not null
  default lpad((floor(random()*999999)+1)::text, 6, '0');
